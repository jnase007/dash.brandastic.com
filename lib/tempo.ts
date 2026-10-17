import type { ProfitabilityData, ProfitClient, TimeEntry } from "./profitability";
import { monthLabel } from "./profitability";

const TEMPO_BASE = "https://api.tempo.io";
const RETAINER_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1boM2Noiiwyrxby2li49DoHxY_Jbkim0FsTKnjRX1GUI/export?format=csv";

type TempoProject = {
  id: string;
  name: string;
  status: string;
  budget?: { amount?: { value?: number } };
  timeframe?: { self?: string };
  scope?: { source?: { reference?: string } };
  laborActuals?: { self?: string };
};

type TempoLabor = {
  worklogId?: number;
  date?: string;
  cost?: { value?: number };
  userRole?: { self?: string };
  user?: { userLink?: { linked?: { originId?: string } } };
};

type TempoWorklog = {
  tempoWorklogId: number;
  timeSpentSeconds?: number;
  startDate?: string;
  description?: string;
  issue?: { id?: number };
  author?: { accountId?: string };
};

type TempoRole = { id: number | string; name: string };

type Allocation = { name: string; hours: number | null };

let cache: { at: number; data: ProfitabilityData } | null = null;

export async function getTempoProfitability(): Promise<ProfitabilityData> {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
  const data = await loadTempoProfitability();
  cache = { at: Date.now(), data };
  return data;
}

async function loadTempoProfitability(): Promise<ProfitabilityData> {
  const asOf = losAngelesDate();
  const bounds = {
    asOf,
    weekStart: mondayOf(asOf),
    monthStart: `${asOf.slice(0, 7)}-01`,
  };
  const [projects, roles, allocations] = await Promise.all([
    tempoOffset<TempoProject>("/4/projects"),
    tempoOffset<TempoRole>("/4/roles"),
    loadAllocations(),
  ]);
  const roleNames = new Map(roles.map((role) => [String(role.id), role.name]));
  const projectByJira = new Map<string, TempoProject>();
  for (const project of projects) {
    const jiraId = project.scope?.source?.reference;
    if (!jiraId) continue;
    const current = projectByJira.get(jiraId);
    if (!current || (project.status === "IN_PROGRESS" && current.status !== "IN_PROGRESS")) {
      projectByJira.set(jiraId, project);
    }
  }

  const jiraIds = new Set<string>([...allocations.keys(), ...projectByJira.keys()]);
  for (const [jiraId, project] of projectByJira) {
    if (project.status !== "IN_PROGRESS" && !allocations.has(jiraId)) jiraIds.delete(jiraId);
  }

  const loaded = await mapPool([...jiraIds], 4, async (jiraId) => {
    const project = projectByJira.get(jiraId);
    const allocation = allocations.get(jiraId);
    let start = bounds.monthStart;
    let end = asOf;
    if (project?.timeframe?.self) {
      const timeframe = await tempoGet<{ startDate?: string; endDate?: string }>(project.timeframe.self);
      start = timeframe.startDate || start;
      end = timeframe.endDate || end;
    }
    const from = start <= asOf ? start : bounds.monthStart;
    const [labor, worklogs] = await Promise.all([
      project?.laborActuals?.self ? tempoOffset<TempoLabor>(project.laborActuals.self) : Promise.resolve([]),
      tempoOffset<TempoWorklog>(`/4/worklogs?projectId=${jiraId}&from=${from}&to=${asOf}`),
    ]);
    return { jiraId, project, allocation, start, end, labor, worklogs };
  });

  const roleByAccount = new Map<string, { date: string; roleId: string }>();
  const costByWorklog = new Map<number, number>();
  for (const row of loaded) {
    for (const labor of row.labor) {
      const accountId = labor.user?.userLink?.linked?.originId;
      const roleId = labor.userRole?.self?.split("/").pop() || "";
      if (accountId && roleId && labor.date) {
        const previous = roleByAccount.get(accountId);
        if (!previous || labor.date > previous.date) roleByAccount.set(accountId, { date: labor.date, roleId });
      }
      if (labor.worklogId) {
        costByWorklog.set(labor.worklogId, (costByWorklog.get(labor.worklogId) || 0) + (labor.cost?.value || 0));
      }
    }
  }

  const clients: ProfitClient[] = [];
  const entries: TimeEntry[] = [];
  const usedSlugs = new Set<string>();
  let describedCount = 0;
  let costedCount = 0;

  for (const row of loaded) {
    const sourceName = row.allocation?.name || (row.project ? shortName(row.project.name) : row.jiraId);
    let slug = slugify(sourceName) || row.jiraId;
    if (usedSlugs.has(slug)) slug = `${slug}-${row.jiraId}`;
    usedSlugs.add(slug);
    const renewalMonth = Number(row.start.slice(5, 7)) || Number(bounds.monthStart.slice(5, 7));
    clients.push({
      slug,
      name: sourceName,
      budgetAmount: row.project?.budget?.amount?.value || 0,
      allocatedHours: row.allocation?.hours ?? null,
      renewalMonth,
      renewalLabel: monthLabel(renewalMonth),
      contractStart: row.start,
      contractEnd: row.end,
    });

    for (const worklog of row.worklogs) {
      if (!worklog.startDate || worklog.startDate > asOf) continue;
      const description = (worklog.description || "").trim().slice(0, 300);
      if (description) describedCount += 1;
      const cost = costByWorklog.get(worklog.tempoWorklogId) || 0;
      if (cost) costedCount += 1;
      const accountId = worklog.author?.accountId || "";
      const roleId = roleByAccount.get(accountId)?.roleId || "";
      const issueId = worklog.issue?.id ? String(worklog.issue.id) : "";
      entries.push({
        id: `${slug}-${worklog.tempoWorklogId}`,
        clientSlug: slug,
        date: worklog.startDate,
        member: roleNames.get(roleId) || "Unassigned",
        taskId: issueId || "—",
        task: issueId ? "Jira issue" : "Untagged time",
        description: description || "No description in Tempo",
        minutes: (worklog.timeSpentSeconds || 0) / 60,
        cost,
      });
    }
  }

  clients.sort((a, b) => a.name.localeCompare(b.name));
  return {
    clients,
    entries,
    bounds,
    coverage: {
      projectCount: clients.length,
      entryCount: entries.length,
      describedCount,
      costedCount,
      allocatedCount: clients.filter((client) => client.allocatedHours != null).length,
    },
  };
}

async function loadAllocations(): Promise<Map<string, Allocation>> {
  const allocations = new Map<string, Allocation>();
  try {
    const response = await fetch(RETAINER_SHEET_CSV, { cache: "no-store", redirect: "follow" });
    if (!response.ok) return allocations;
    const text = await response.text();
    if (!text.includes("Jira Project ID")) return allocations;
    const rows = parseCsv(text).slice(2);
    for (const row of rows) {
      const name = (row[0] || "").trim();
      const projectId = (row[11] || "").trim();
      const parsedHours = Number.parseFloat(row[12] || "");
      const hours = Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : null;
      if (!projectId) continue;
      const existing = allocations.get(projectId);
      if (!existing) {
        allocations.set(projectId, { name: name || projectId, hours });
        continue;
      }
      const names = [existing.name, name].filter(Boolean);
      const combined = (existing.hours || 0) + (hours || 0);
      allocations.set(projectId, {
        name: [...new Set(names)].join(" / "),
        hours: combined > 0 ? combined : null,
      });
    }
  } catch {
    return allocations;
  }
  return allocations;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function shortName(name: string) {
  return name.replace(/\s*\(.*$/, "").replace(/\)+$/g, "").trim();
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function losAngelesDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

function mondayOf(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

async function tempoGet<T>(path: string): Promise<T> {
  const token = process.env.TEMPO_API_TOKEN;
  if (!token) throw new Error("TEMPO_API_TOKEN is not set");
  const response = await fetch(path.startsWith("http") ? path : `${TEMPO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Tempo request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function tempoOffset<T>(path: string, limit = 1000): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  while (offset <= 50000) {
    const separator = path.includes("?") ? "&" : "?";
    const page = await tempoGet<{ results?: T[] }>(`${path}${separator}offset=${offset}&limit=${limit}`);
    const rows = page.results || [];
    items.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }
  return items;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      out[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}
