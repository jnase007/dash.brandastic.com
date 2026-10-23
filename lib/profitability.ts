export const PROFIT_RANGES = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "Contract Year" },
] as const;

export type ProfitRange = (typeof PROFIT_RANGES)[number]["id"];

export type RenewalKind = "date" | "mtm" | "unknown";

export type ProfitClient = {
  slug: string;
  name: string;
  budgetAmount: number;
  allocatedHours: number | null;
  renewalKind: RenewalKind;
  renewalDate: string | null;
  renewalMonth: number;
  renewalLabel: string;
  contractStart: string;
  contractEnd: string;
};

export type TimeEntry = {
  id: string;
  clientSlug: string;
  date: string;
  member: string;
  taskId: string;
  task: string;
  description: string;
  minutes: number;
  cost: number;
};

export type DateBounds = {
  asOf: string;
  weekStart: string;
  monthStart: string;
};

export type TempoCoverage = {
  projectCount: number;
  entryCount: number;
  describedCount: number;
  costedCount: number;
  allocatedCount: number;
};

export type ProfitabilityData = {
  clients: ProfitClient[];
  entries: TimeEntry[];
  bounds: DateBounds;
  coverage: TempoCoverage;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function clientBySlug(clients: ProfitClient[], slug: string) {
  return clients.find((client) => client.slug === slug);
}

export function entriesFor(
  entries: TimeEntry[],
  clients: ProfitClient[],
  range: ProfitRange,
  clientSlug: string,
  bounds: DateBounds
) {
  const bySlug = new Map(clients.map((client) => [client.slug, client]));
  return entries.filter((entry) => {
    if (clientSlug !== "all" && entry.clientSlug !== clientSlug) return false;
    const client = bySlug.get(entry.clientSlug);
    if (!client) return false;
    if (range === "year" && !client.contractStart) return false;
    const start =
      range === "week" ? bounds.weekStart : range === "month" ? bounds.monthStart : client.contractStart;
    const end = range === "year" ? client.contractEnd : bounds.asOf;
    return entry.date >= start && entry.date <= end;
  });
}

export function contractYearWindow(kind: RenewalKind, renewalDate: string | null, asOf: string) {
  if (kind === "mtm") return { start: shiftMonths(asOf, -11), end: asOf };
  if (kind === "date" && renewalDate) {
    const start = addDays(renewalDate, -365);
    return { start, end: renewalDate < asOf ? renewalDate : asOf };
  }
  return null;
}

export function contractMonths(client: ProfitClient) {
  if (!client.contractStart || !client.contractEnd) return null;
  if (client.renewalKind === "mtm") return 12;
  return elapsedContractMonths(client.contractStart, client.contractEnd);
}

export type HourSummary = {
  totalMinutes: number;
  cost: number;
};

export function summarize(entries: TimeEntry[]): HourSummary {
  let totalMinutes = 0;
  let cost = 0;
  for (const entry of entries) {
    totalMinutes += entry.minutes;
    cost += entry.cost;
  }
  return { totalMinutes, cost };
}

export function hoursBudget(client: ProfitClient, range: ProfitRange, bounds: DateBounds): number | null {
  const monthly = client.allocatedHours;
  if (monthly == null || monthly <= 0) return null;
  if (range === "month") return monthly;
  if (range === "week") {
    const days = eachDate(bounds.weekStart, bounds.asOf).length;
    const dim = daysInMonth(bounds.asOf);
    return monthly * (days / dim);
  }
  const months = contractMonths(client);
  return months == null ? null : monthly * months;
}

export function elapsedContractMonths(start: string, asOf: string) {
  const end = asOf < start ? start : asOf;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const daysInEnd = new Date(Date.UTC(ey, em, 0)).getUTCDate();
  const months = (ey - sy) * 12 + (em - sm) + (ed - sd) / daysInEnd;
  return Math.max(months, 1 / 31);
}

export type TrendSummary = {
  averageHours: number;
  allocatedHours: number | null;
  renewalLabel: string;
};

export function contractTrend(
  entries: TimeEntry[],
  clients: ProfitClient[],
  clientSlug: string,
  asOf: string
): TrendSummary {
  const list = clientSlug === "all" ? clients : clients.filter((client) => client.slug === clientSlug);
  const averages = list.flatMap((client) => {
    const months = contractMonths(client);
    if (months == null) return [];
    const minutes = entries
      .filter(
        (entry) =>
          entry.clientSlug === client.slug && entry.date >= client.contractStart && entry.date <= client.contractEnd
      )
      .reduce((sum, entry) => sum + entry.minutes, 0);
    return [minutes / 60 / months];
  });
  const allocations = list
    .map((client) => client.allocatedHours)
    .filter((hours): hours is number => hours != null && hours > 0);
  return {
    averageHours: mean(averages),
    allocatedHours: allocations.length ? mean(allocations) : null,
    renewalLabel: clientSlug === "all" ? nextRenewalLabel(clients, asOf) : list[0]?.renewalLabel || "—",
  };
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nextRenewalLabel(clients: ProfitClient[], asOf: string) {
  const upcoming = clients
    .filter((client) => client.renewalKind === "date" && client.renewalDate && client.renewalDate >= asOf)
    .map((client) => client.renewalDate as string)
    .sort()[0];
  return upcoming ? formatEntryDate(upcoming) : "—";
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonths(iso: string, monthDelta: number) {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + monthDelta, 1));
  return date.toISOString().slice(0, 10);
}

export type ChartBucket = {
  key: string;
  label: string;
  minutes: number;
};

export function chartBuckets(range: ProfitRange, entries: TimeEntry[], bounds: DateBounds): ChartBucket[] {
  if (range === "week") {
    return eachDate(bounds.weekStart, bounds.asOf).map((date) =>
      bucket(date, weekdayLabel(date), entries.filter((entry) => entry.date === date))
    );
  }
  if (range === "month") {
    const groups = new Map<string, TimeEntry[]>();
    for (const entry of entries) {
      const key = weekKey(entry.date);
      const list = groups.get(key) || [];
      list.push(entry);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => {
        const first = [...list].sort((a, b) => a.date.localeCompare(b.date))[0];
        return bucket(key, shortDate(first?.date || key), list);
      });
  }
  const groups = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const list = groups.get(key) || [];
    list.push(entry);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => bucket(key, MONTHS[Number(key.slice(5, 7)) - 1], list));
}

function eachDate(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function bucket(key: string, label: string, entries: TimeEntry[]): ChartBucket {
  const minutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  return { key, label, minutes };
}

function daysInMonth(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekKey(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function shortDate(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

function weekdayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${names[weekday]} ${day}`;
}

export type DonutSlice = {
  label: string;
  minutes: number;
  color: string;
};

const SLICE_COLORS = ["#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#4c1d95", "#ddd6fe"];

export function donutSlices(entries: TimeEntry[], clients: ProfitClient[], clientSlug: string): DonutSlice[] {
  const names = new Map(clients.map((client) => [client.slug, client.name]));
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const label = clientSlug === "all" ? names.get(entry.clientSlug) || entry.clientSlug : entry.member;
    totals.set(label, (totals.get(label) || 0) + entry.minutes);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, minutes], index) => ({
      label,
      minutes,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
    }));
}

export function formatDuration(minutes: number) {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${pad(mins)}:${pad(seconds)}`;
}

export function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatEntryDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function burnHealth(pct: number): "ok" | "warn" | "over" {
  if (pct >= 100) return "over";
  if (pct >= 80) return "warn";
  return "ok";
}

export function moneyExact(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function monthLabel(month: number) {
  return MONTHS[month - 1] || "—";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
