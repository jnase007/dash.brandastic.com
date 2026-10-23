import type { ProfitabilityData, ProfitClient, RenewalKind, TimeEntry } from "./profitability";
import { contractYearWindow, formatEntryDate, quarterStartDate } from "./profitability";

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

type SheetRenewal = { kind: RenewalKind; date?: string };
type Allocation = { name: string; hours: number | null; renewal: SheetRenewal };

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
    quarterStart: quarterStartDate(asOf),
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

  if (allocations.size === 0) {
    throw new Error("The Brand Care Clients sheet did not return any Jira project ids.");
  }
  const jiraIds = [...allocations.keys()];

  const loaded = await mapPool(jiraIds, 4, async (jiraId) => {
    const project = projectByJira.get(jiraId);
    const allocation = allocations.get(jiraId);
    const renewal = allocation?.renewal ?? { kind: "unknown" as const };
    const renewalDate = renewal.kind === "date" ? renewal.date ?? null : null;
    const window = contractYearWindow(renewal.kind, renewalDate, asOf);
    const from = [bounds.quarterStart, bounds.monthStart, window?.start].filter((date): date is string => Boolean(date)).sort()[0];
    const [labor, worklogs] = await Promise.all([
      project?.laborActuals?.self ? tempoOffset<TempoLabor>(project.laborActuals.self) : Promise.resolve([]),
      tempoOffset<TempoWorklog>(`/4/worklogs?projectId=${jiraId}&from=${from}&to=${asOf}`),
    ]);
    return { jiraId, project, allocation, window, labor, worklogs };
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
    const renewal = row.allocation?.renewal ?? { kind: "unknown" as const };
    const renewalDate = renewal.kind === "date" ? renewal.date ?? null : null;
    clients.push({
      slug,
      name: sourceName,
      budgetAmount: row.project?.budget?.amount?.value || 0,
      allocatedHours: row.allocation?.hours ?? null,
      renewalKind: renewal.kind,
      renewalDate,
      renewalMonth: renewalDate ? Number(renewalDate.slice(5, 7)) : 0,
      renewalLabel: renewalLabel(renewal.kind, renewalDate),
      contractStart: row.window?.start || "",
      contractEnd: row.window?.end || "",
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
      const renewal = parseRenewal(row[2] || "");
      if (!projectId) continue;
      const existing = allocations.get(projectId);
      if (!existing) {
        allocations.set(projectId, { name: name || projectId, hours, renewal });
        continue;
      }
      const names = [existing.name, name].filter(Boolean);
      const combined = (existing.hours || 0) + (hours || 0);
      allocations.set(projectId, {
        name: [...new Set(names)].join(" / "),
        hours: combined > 0 ? combined : null,
        renewal: existing.renewal.kind === "unknown" ? renewal : existing.renewal,
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

function parseRenewal(value: string): SheetRenewal {
  const text = value.trim();
  if (/^mtm$/i.test(text)) return { kind: "mtm" };
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return { kind: "unknown" };
  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return { kind: "unknown" };
  return { kind: "date", date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

function renewalLabel(kind: RenewalKind, renewalDate: string | null) {
  if (kind === "mtm") return "MTM";
  if (kind === "date" && renewalDate) return formatEntryDate(renewalDate);
  return "—";
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
