import type { MetricSet } from "./types";
import { money, num, pct, ratio } from "./format";

export type MetricKey =
  | "spend"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "conversions"
  | "cpa"
  | "roas";

export type MetricColumn = {
  key: MetricKey;
  label: string;
  short: string;
  kind: "money" | "count" | "pct" | "ratio";
  /** Lower is healthier for efficiency/cost metrics. */
  invert: boolean;
};

/** Shared metric columns for every client, Compare, and Deep Analysis. */
export const METRIC_COLUMNS: MetricColumn[] = [
  { key: "spend", label: "Spend", short: "Spend", kind: "money", invert: false },
  {
    key: "impressions",
    label: "Impressions",
    short: "Impr.",
    kind: "count",
    invert: false,
  },
  { key: "clicks", label: "Clicks", short: "Clicks", kind: "count", invert: false },
  { key: "ctr", label: "CTR", short: "CTR", kind: "pct", invert: false },
  { key: "cpc", label: "CPC", short: "CPC", kind: "money", invert: true },
  {
    key: "conversions",
    label: "Conversions",
    short: "Conv.",
    kind: "count",
    invert: false,
  },
  { key: "cpa", label: "CPA", short: "CPA", kind: "money", invert: true },
  { key: "roas", label: "ROAS", short: "ROAS", kind: "ratio", invert: false },
];

export function emptyMetrics(): MetricSet {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: null,
    cpa: null,
    roas: null,
  };
}

export function metricValue(metrics: MetricSet | null | undefined, key: MetricKey) {
  if (!metrics) return null;
  const value = metrics[key];
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

export function formatMetric(value: number | null | undefined, kind: MetricColumn["kind"]) {
  if (value == null || Number.isNaN(value)) return "—";
  if (kind === "money") return money(value);
  if (kind === "count") return num(value);
  if (kind === "pct") return pct(value);
  return ratio(value);
}

export function formatMetricCell(
  metrics: MetricSet | null | undefined,
  column: MetricColumn
) {
  return formatMetric(metricValue(metrics, column.key), column.kind);
}
