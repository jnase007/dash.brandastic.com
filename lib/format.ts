export function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

export function num(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * (n > 1 ? 1 : 100)).toFixed(2)}%`.replace("100.00%", n > 1 ? `${n.toFixed(2)}%` : "100.00%");
}

export function ratio(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(2)}x`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CUSTOM_RANGE = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isCustomRange(range: string) {
  return CUSTOM_RANGE.test(range);
}

export function encodeCustomRange(from: string, to: string) {
  return `${from}_${to}`;
}

export function parseCustomRange(range: string) {
  const match = range.match(CUSTOM_RANGE);
  if (!match) return null;
  const since = match[1];
  const until = match[2];
  if (!parseIsoDate(since) || !parseIsoDate(until)) return null;
  return { since, until };
}

export function normalizeRange(range?: string | null) {
  if (!range) return "30d";
  if (["7d", "14d", "30d", "60d", "90d"].includes(range)) return range;
  const custom = parseCustomRange(range);
  if (!custom) return "30d";
  // ensure since <= until
  if (custom.since > custom.until) {
    return encodeCustomRange(custom.until, custom.since);
  }
  return encodeCustomRange(custom.since, custom.until);
}

export function compactRangeLabel(range: string) {
  const value = normalizeRange(range);
  if (value === "7d") return "Last 7 days";
  if (value === "14d") return "Last 14 days";
  if (value === "30d") return "Last 30 days";
  if (value === "60d") return "Last 60 days";
  if (value === "90d") return "Last 90 days";
  const custom = parseCustomRange(value);
  if (custom) {
    const fmt = (iso: string) => {
      const d = parseIsoDate(iso);
      if (!d) return iso;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    };
    return `${fmt(custom.since)} – ${fmt(custom.until)}`;
  }
  return value;
}

export function datePreset(range: string) {
  const value = normalizeRange(range);
  const custom = parseCustomRange(value);
  if (custom) {
    const start = parseIsoDate(custom.since)!;
    const end = parseIsoDate(custom.until)!;
    const days =
      Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
    return { since: custom.since, until: custom.until, days };
  }

  const end = new Date();
  const start = new Date();
  const days =
    value === "7d"
      ? 7
      : value === "14d"
        ? 14
        : value === "60d"
          ? 60
          : value === "90d"
            ? 90
            : 30;
  start.setDate(end.getDate() - (days - 1));
  return { since: toIsoDate(start), until: toIsoDate(end), days };
}
