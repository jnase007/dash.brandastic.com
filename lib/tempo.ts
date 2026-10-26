import { unstable_cache } from "next/cache";
import type { CostRate, ProfitabilityData, ProfitClient, RenewalKind, TimeEntry } from "./profitability";
import { contractYearWindow, formatEntryDate, quarterStartDate } from "./profitability";
import { OTHER_TRACKED_SLUG, projectKeySlug } from "./team";

const TEMPO_BASE = "https://api.tempo.io";
const RETAINER_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1boM2Noiiwyrxby2li49DoHxY_Jbkim0FsTKnjRX1GUI/export?format=csv";
const COST_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/15tea60E_4d04GauxU7Sb4RYYnCIAifj0GWNAx3hmEQM/export?format=csv";

type TempoProject = {
  id: string;
  name: string;
  status: string;
  budget?: { amount?: { value?: number } };
  timeframe?: { self?: string };
  scope?: { source?: { reference?: string; title?: string }; tasks?: { self?: string } };
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

type TempoTeam = { id: number; name: string; status?: string };

type TempoTeamMember = {
  member?: { accountId?: string };
  memberships?: { active?: { role?: { name?: string } } };
};

type SheetRenewal = { kind: RenewalKind; date?: string };
type Allocation = { name: string; hours: number | null; renewal: SheetRenewal; billableRate: number | null };

const DATA_VERSION = 7;
let cache: { at: number; version: number; data: ProfitabilityData } | null = null;

const loadCachedTempoProfitability = unstable_cache(
  async () => loadTempoProfitability(),
  ["tempo-profitability-v7"],
  { revalidate: 300, tags: ["tempo-profitability"] }
);

export async function getTempoProfitability(): Promise<ProfitabilityData> {
  if (cache && cache.version === DATA_VERSION && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
  const data = await loadCachedTempoProfitability();
  cache = { at: Date.now(), version: DATA_VERSION, data };
  return data;
}

/** Faster client pages: only pull Tempo labor/worklogs for matching retainer rows. */
export async function getTempoProfitabilityForSlug(slug: string): Promise<ProfitabilityData> {
  if (cache && cache.version === DATA_VERSION && Date.now() - cache.at < 5 * 60 * 1000) {
    const filtered = filterProfitData(cache.data, slug);
    if (filtered.clients.length > 0) return filtered;
  }
  try {
    // Load only matching retainer projects (much fewer Tempo calls than full portfolio).
    return await loadTempoProfitability({ slug });
  } catch {
    const full = await getTempoProfitability();
    return filterProfitData(full, slug);
  }
}

const TEAM_VERSION = 1;
let teamCache: { at: number; version: number; data: ProfitabilityData } | null = null;

const loadCachedTeamPerformance = unstable_cache(
  async () => loadTeamPerformance(),
  ["tempo-team-performance-v1"],
  { revalidate: 300, tags: ["tempo-profitability"] }
);

/** Team pages: every Tempo worklog in the quarter, not only Brand Care projects. */
export async function getTeamPerformanceData(): Promise<ProfitabilityData> {
  if (teamCache && teamCache.version === TEAM_VERSION && Date.now() - teamCache.at < 5 * 60 * 1000) return teamCache.data;
  const data = await loadCachedTeamPerformance();
  teamCache = { at: Date.now(), version: TEAM_VERSION, data };
  return data;
}

async function loadTeamPerformance(): Promise<ProfitabilityData> {
  const profit = await getTempoProfitability();
  const from = profit.bounds.quarterStart;
  const to = profit.bounds.asOf;
  const [projects, teams, allocations, worklogs] = await Promise.all([
    tempoOffset<TempoProject>("/4/projects"),
    tempoOffset<TempoTeam>("/4/teams"),
    loadAllocations(),
    tempoOffset<TempoWorklog>(`/4/worklogs?from=${from}&to=${to}`),
  ]);
  const employeeTeam = teams.find((team) => team.status === "ACTIVE" && /employee/i.test(team.name) && /dashboard/i.test(team.name))
    || teams.find((team) => team.status === "ACTIVE" && /employee/i.test(team.name));
  if (!employeeTeam) throw new Error("Tempo has no active Employees team.");
  const employeeMembers = await tempoOffset<TempoTeamMember>(`/4/teams/${employeeTeam.id}/members`);
  const memberNames = new Map(
    employeeMembers.flatMap((row) => {
      const accountId = row.member?.accountId || "";
      const name = row.memberships?.active?.role?.name || "";
      return accountId && name ? [[accountId, name] as const] : [];
    })
  );

  const clientName = new Map(profit.clients.map((client) => [client.slug, client.name]));
  const knownIssues = new Map<string, { slug: string; name: string }>();
  for (const entry of profit.entries) {
    if (!/^\d+$/.test(entry.taskId) || knownIssues.has(entry.taskId)) continue;
    knownIssues.set(entry.taskId, { slug: entry.clientSlug, name: clientName.get(entry.clientSlug) || entry.clientSlug });
  }

  const outsideByJira = new Map<string, TempoProject>();
  for (const project of projects) {
    const jiraId = project.scope?.source?.reference;
    if (!jiraId || allocations.has(jiraId) || !project.scope?.tasks?.self) continue;
    const current = outsideByJira.get(jiraId);
    if (!current || (project.status === "IN_PROGRESS" && current.status !== "IN_PROGRESS")) outsideByJira.set(jiraId, project);
  }
  const taskRows = await mapPool([...outsideByJira.entries()], 4, async ([jiraId, project]) => {
    const title = project.scope?.source?.title || shortName(project.name) || jiraId;
    const tasks = await tempoOffset<{ taskLink?: { linked?: { originId?: string } } }>(project.scope!.tasks!.self!);
    return { jiraId, title, tasks };
  });
  const usedSlugs = new Set(profit.clients.map((client) => client.slug));
  const tempoIssues = new Map<string, { slug: string; name: string }>();
  for (const row of taskRows) {
    let slug = slugify(shortName(row.title)) || `tempo-${row.jiraId}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${row.jiraId}`;
    usedSlugs.add(slug);
    const name = shortName(row.title) || row.title;
    for (const task of row.tasks) {
      const origin = task.taskLink?.linked?.originId;
      if (!origin || knownIssues.has(origin)) continue;
      tempoIssues.set(origin, { slug, name });
    }
  }

  const names = new Map<string, string>();
  const entries: TimeEntry[] = [];
  for (const worklog of worklogs) {
    if (!worklog.startDate || worklog.startDate < from || worklog.startDate > to) continue;
    const issueId = worklog.issue?.id ? String(worklog.issue.id) : "";
    const project = (issueId && (knownIssues.get(issueId) || tempoIssues.get(issueId))) || namedFromNote(worklog.description || "");
    names.set(project.slug, project.name);
    const description = (worklog.description || "").trim().slice(0, 300);
    entries.push({
      id: `team-${worklog.tempoWorklogId}`,
      clientSlug: project.slug,
      date: worklog.startDate,
      member: memberNames.get(worklog.author?.accountId || "") || "Unassigned",
      taskId: issueId || "—",
      task: issueId ? "Jira issue" : "Untagged time",
      description: description || "No description in Tempo",
      minutes: (worklog.timeSpentSeconds || 0) / 60,
      cost: 0,
    });
  }

  const clients = [...profit.clients];
  for (const [slug, name] of names) {
    if (clients.some((client) => client.slug === slug)) continue;
    clients.push({
      slug,
      name,
      budgetAmount: 0,
      allocatedHours: null,
      billableRate: null,
      renewalKind: "unknown",
      renewalDate: null,
      renewalMonth: 0,
      renewalLabel: "—",
      contractStart: from,
      contractEnd: to,
    });
  }
  clients.sort((a, b) => a.name.localeCompare(b.name));
  return { ...profit, clients, entries, reportSlugs: profit.clients.map((client) => client.slug) };
}

function namedFromNote(description: string) {
  const match = description.match(/work item\s+([A-Z][A-Z0-9]{1,12})-\d+/i);
  if (!match) return { slug: OTHER_TRACKED_SLUG, name: "Other tracked time" };
  const key = match[1].toUpperCase();
  return { slug: projectKeySlug(key), name: key };
}

function filterProfitData(data: ProfitabilityData, slug: string): ProfitabilityData {
  const directory = data.directory?.length
    ? data.directory
    : data.clients.map((client) => ({ slug: client.slug, name: client.name }));
  const clients = data.clients.filter((client) => client.slug === slug);
  const entries = data.entries.filter((entry) => entry.clientSlug === slug);
  return {
    ...data,
    directory,
    clients,
    entries,
    coverage: {
      ...data.coverage,
      projectCount: clients.length,
      entryCount: entries.length,
      describedCount: entries.filter((entry) => entry.description && entry.description !== "No description in Tempo").length,
      costedCount: entries.filter((entry) => entry.cost > 0).length,
      allocatedCount: clients.filter((client) => client.allocatedHours != null).length,
    },
  };
}

async function loadTempoProfitability(opts?: { slug?: string }): Promise<ProfitabilityData> {
  const asOf = losAngelesDate();
  const bounds = {
    asOf,
    quarterStart: quarterStartDate(asOf),
    monthStart: `${asOf.slice(0, 7)}-01`,
  };
  const [projects, teams, allocations, costSheet] = await Promise.all([
    tempoOffset<TempoProject>("/4/projects"),
    tempoOffset<TempoTeam>("/4/teams"),
    loadAllocations(),
    loadCostSheet(),
  ]);
  const costRates = costSheet.rates;
  const employeeTeam = teams.find((team) => team.status === "ACTIVE" && /employee/i.test(team.name) && /dashboard/i.test(team.name))
    || teams.find((team) => team.status === "ACTIVE" && /employee/i.test(team.name));
  if (!employeeTeam) throw new Error("Tempo has no active Employees team.");
  const employeeMembers = await tempoOffset<TempoTeamMember>(`/4/teams/${employeeTeam.id}/members`);
  const memberNames = new Map(
    employeeMembers.flatMap((row) => {
      const accountId = row.member?.accountId || "";
      const name = row.memberships?.active?.role?.name || "";
      return accountId && name ? [[accountId, name] as const] : [];
    })
  );
  const roster = [...new Set(memberNames.values())].sort((a, b) => a.localeCompare(b));
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
  let jiraIds = [...allocations.keys()];
  if (opts?.slug) {
    const wanted = opts.slug.toLowerCase();
    jiraIds = jiraIds.filter((jiraId) => {
      const allocation = allocations.get(jiraId);
      const name = allocation?.name || "";
      const slug = slugify(name) || jiraId;
      return slug === wanted || slug.startsWith(wanted + "-") || name.toLowerCase().includes(wanted.replace(/-/g, " "));
    });
    if (jiraIds.length === 0) {
      throw new Error(`No retainer row matched slug "${opts.slug}"`);
    }
  }

  const loaded = await mapPool(jiraIds, 8, async (jiraId) => {
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

  const costByWorklog = new Map<number, number>();
  for (const row of loaded) {
    for (const labor of row.labor) {
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
      billableRate: row.allocation?.billableRate ?? null,
    });

    for (const worklog of row.worklogs) {
      if (!worklog.startDate || worklog.startDate > asOf) continue;
      const description = (worklog.description || "").trim().slice(0, 300);
      if (description) describedCount += 1;
      const cost = costByWorklog.get(worklog.tempoWorklogId) || 0;
      if (cost) costedCount += 1;
      const accountId = worklog.author?.accountId || "";
      const issueId = worklog.issue?.id ? String(worklog.issue.id) : "";
      entries.push({
        id: `${slug}-${worklog.tempoWorklogId}`,
        clientSlug: slug,
        date: worklog.startDate,
        member: memberNames.get(accountId) || "Unassigned",
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
    directory: clientDirectory(allocations),
    entries,
    bounds,
    coverage: {
      projectCount: clients.length,
      entryCount: entries.length,
      describedCount,
      costedCount,
      allocatedCount: clients.filter((client) => client.allocatedHours != null).length,
    },
    costRates,
    monthlyOverhead: costSheet.monthlyOverhead,
    payingAllocatedHours: payingAllocatedHours(allocations),
    roster,
  };
}

async function loadAllocations(): Promise<Map<string, Allocation>> {
  const allocations = new Map<string, Allocation>();
  try {
    const response = await fetch(RETAINER_SHEET_CSV, { next: { revalidate: 300 }, redirect: "follow" });
    if (!response.ok) return allocations;
    const text = await response.text();
    if (!text.includes("Jira Project ID")) return allocations;
    const rows = parseCsv(text).slice(2);
    for (const row of rows) {
      const name = (row[0] || "").trim();
      const projectId = (row[11] || "").trim();
      const parsedHours = Number.parseFloat(row[12] || "");
      const hours = Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : null;
      const rate = parseMoney(row[13] || "");
      const renewal = parseRenewal(row[2] || "");
      if (!projectId) continue;
      const existing = allocations.get(projectId);
      if (!existing) {
        allocations.set(projectId, { name: name || projectId, hours, renewal, billableRate: rate });
        continue;
      }
      const names = [existing.name, name].filter(Boolean);
      const combined = (existing.hours || 0) + (hours || 0);
      allocations.set(projectId, {
        name: [...new Set(names)].join(" / "),
        hours: combined > 0 ? combined : null,
        renewal: existing.renewal.kind === "unknown" ? renewal : existing.renewal,
        billableRate: existing.billableRate ?? rate,
      });
    }
  } catch {
    return allocations;
  }
  return allocations;
}

async function loadCostSheet(): Promise<{ rates: CostRate[]; monthlyOverhead: number | null }> {
  try {
    const response = await fetch(COST_SHEET_CSV, { cache: "no-store", redirect: "follow" });
    if (!response.ok) return { rates: [], monthlyOverhead: null };
    const rates: CostRate[] = [];
    let monthlyOverhead: number | null = null;
    for (const row of parseCsv(await response.text())) {
      const name = (row[0] || "").trim();
      const hourly = parseMoney(row[1] || "");
      if (name && hourly != null) rates.push({ name, hourly });
      const overhead = parseMoney(row[4] || "");
      if (monthlyOverhead == null && overhead != null && /overhead/i.test(row[3] || "")) monthlyOverhead = overhead;
    }
    return { rates, monthlyOverhead };
  } catch {
    return { rates: [], monthlyOverhead: null };
  }
}

function payingAllocatedHours(allocations: Map<string, Allocation>) {
  let total = 0;
  for (const allocation of allocations.values()) {
    if (allocation.hours != null && allocation.hours > 0 && allocation.billableRate != null && allocation.billableRate > 0) {
      total += allocation.hours;
    }
  }
  return total;
}

function parseMoney(value: string) {
  const amount = Number.parseFloat(value.replace(/[$,]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
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

function clientDirectory(allocations: Map<string, Allocation>) {
  const usedSlugs = new Set<string>();
  const directory: { slug: string; name: string }[] = [];
  for (const [jiraId, allocation] of allocations) {
    const name = allocation.name || jiraId;
    let slug = slugify(name) || jiraId;
    if (usedSlugs.has(slug)) slug = `${slug}-${jiraId}`;
    usedSlugs.add(slug);
    directory.push({ slug, name });
  }
  directory.sort((a, b) => a.name.localeCompare(b.name));
  return directory;
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
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    next: { revalidate: 300 },
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
