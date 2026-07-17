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

/** Dashboard reporting timezone — match Ads Manager / Brandastic ops default. */
export function dashTimezone() {
  return process.env.DASH_TIMEZONE || "America/Los_Angeles";
}

/** YYYY-MM-DD for a Date in a specific IANA timezone (not UTC-shifted). */
export function toIsoDateInTz(d: Date, timeZone = dashTimezone()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function toIsoDate(d: Date) {
  // Prefer LA/reporting TZ so evening PST does not roll the calendar day to UTC tomorrow.
  return toIsoDateInTz(d);
}

function parseIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Add whole days to an ISO date string (noon UTC anchor avoids DST edge cases). */
function addIsoDays(iso: string, days: number) {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today in reporting TZ as YYYY-MM-DD. */
export function todayInDashTz() {
  return toIsoDateInTz(new Date());
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

/**
 * Date windows for Meta + Google.
 *
 * Presets match Ads Manager defaults:
 * - Meta `last_Nd` ends YESTERDAY (excludes today)
 * - Google `LAST_N_DAYS` ends YESTERDAY (excludes today)
 *
 * Custom ranges stay inclusive as selected.
 */
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
    return {
      since: custom.since,
      until: custom.until,
      days,
      preset: null as string | null,
      googleDuring: null as string | null,
      metaDatePreset: null as string | null,
      endsOn: "custom" as const,
    };
  }

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

  // Ads Manager-style: complete days ending yesterday in reporting TZ.
  const until = addIsoDays(todayInDashTz(), -1);
  const since = addIsoDays(until, -(days - 1));

  // Google DURING presets only exist for common N; 14d falls back to BETWEEN.
  const googleDuring =
    days === 7
      ? "LAST_7_DAYS"
      : days === 30
        ? "LAST_30_DAYS"
        : days === 14
          ? null
          : null;

  // Meta date_preset for last_Nd (ends yesterday). No first-class 14/60/90 in all versions;
  // use last_7d / last_30d / last_90d when available, else custom time_range.
  const metaDatePreset =
    days === 7
      ? "last_7d"
      : days === 30
        ? "last_30d"
        : days === 90
          ? "last_90d"
          : null;

  return {
    since,
    until,
    days,
    preset: value,
    googleDuring,
    metaDatePreset,
    endsOn: "yesterday" as const,
  };
}
