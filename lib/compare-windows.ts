import {
  compactRangeLabel,
  datePreset,
  encodeCustomRange,
  normalizeRange,
  parseCustomRange,
  previousRangeKey,
} from "./format";

export const DEFAULT_COMPARE_CURRENT = "2026-08-01_2026-08-10";

export type CompareWindow = {
  id: "current" | "previousPeriod" | "previousMonth" | "previousYear";
  label: string;
  short: string;
  range: string;
  since: string;
  until: string;
};

function shiftIsoByMonths(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const clamped = Math.min(day, lastDay);
  date.setUTCDate(clamped);
  return date.toISOString().slice(0, 10);
}

function windowFromRange(
  id: CompareWindow["id"],
  label: string,
  short: string,
  range: string
): CompareWindow {
  const preset = datePreset(range);
  return {
    id,
    label,
    short,
    range,
    since: preset.since,
    until: preset.until,
  };
}

/** Locked Compare set: current vs prior month vs prior year. Prior equal-length is included for the period toggle. */
export function compareWindowSet(currentRange = DEFAULT_COMPARE_CURRENT) {
  const range = normalizeRange(currentRange);
  const currentPreset = datePreset(range);
  const current = windowFromRange(
    "current",
    compactRangeLabel(range),
    "Current",
    range
  );
  const previousPeriodKey = previousRangeKey(range).key;
  const previousPeriod = windowFromRange(
    "previousPeriod",
    compactRangeLabel(previousPeriodKey),
    "Prior period",
    previousPeriodKey
  );
  const monthRange = encodeCustomRange(
    shiftIsoByMonths(currentPreset.since, -1),
    shiftIsoByMonths(currentPreset.until, -1)
  );
  const previousMonth = windowFromRange(
    "previousMonth",
    compactRangeLabel(monthRange),
    "Prior month",
    monthRange
  );
  const yearRange = encodeCustomRange(
    shiftIsoByMonths(currentPreset.since, -12),
    shiftIsoByMonths(currentPreset.until, -12)
  );
  const previousYear = windowFromRange(
    "previousYear",
    compactRangeLabel(yearRange),
    "Prior year",
    yearRange
  );

  return {
    current,
    previousPeriod,
    previousMonth,
    previousYear,
    ranges: [current.range, previousMonth.range, previousYear.range],
    all: [current, previousMonth, previousYear] as CompareWindow[],
    withPriorPeriod: [current, previousPeriod, previousMonth, previousYear] as CompareWindow[],
  };
}

export function resolveCompareCurrent(range?: string | null) {
  if (!range) return DEFAULT_COMPARE_CURRENT;
  if (parseCustomRange(range) || ["7d", "14d", "30d", "60d", "90d"].includes(range)) {
    return normalizeRange(range);
  }
  return DEFAULT_COMPARE_CURRENT;
}
