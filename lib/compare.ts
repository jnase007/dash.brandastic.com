import type { MetricSet } from "./types";

export type Delta = {
  abs: number | null;
  pct: number | null;
  direction: "up" | "down" | "flat" | "na";
};

function delta(current: number | null | undefined, previous: number | null | undefined): Delta {
  if (current == null || previous == null || Number.isNaN(current) || Number.isNaN(previous)) {
    return { abs: null, pct: null, direction: "na" };
  }
  const abs = current - previous;
  if (Math.abs(abs) < 0.0001) return { abs: 0, pct: 0, direction: "flat" };
  const pct = previous === 0 ? null : abs / Math.abs(previous);
  return {
    abs,
    pct,
    direction: abs > 0 ? "up" : abs < 0 ? "down" : "flat",
  };
}

/** Stable pseudo previous-period metrics for demo / partial until true history is wired. */
export function previousMetrics(current: MetricSet, seed = 1): MetricSet {
  const factor = 0.86 + ((seed % 7) * 0.03);
  const spend = current.spend * factor;
  const impressions = current.impressions * (factor + 0.02);
  const clicks = current.clicks * (factor - 0.01);
  const conversions = current.conversions * (factor + 0.04);
  return {
    spend,
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : null,
    conversions,
    cpa: conversions ? spend / conversions : null,
    roas: current.roas == null ? null : current.roas * (1.08 - (seed % 5) * 0.03),
  };
}

export function metricDeltas(current: MetricSet, previous: MetricSet) {
  return {
    spend: delta(current.spend, previous.spend),
    clicks: delta(current.clicks, previous.clicks),
    conversions: delta(current.conversions, previous.conversions),
    cpa: delta(current.cpa, previous.cpa),
    roas: delta(current.roas, previous.roas),
    ctr: delta(current.ctr, previous.ctr),
  };
}

/** For cost metrics, down is good. For volume/ROAS, up is good. */
export function isHealthyDelta(
  key: "spend" | "clicks" | "conversions" | "cpa" | "roas" | "ctr",
  direction: Delta["direction"]
) {
  if (direction === "flat" || direction === "na") return null;
  if (key === "cpa" || key === "spend") return direction === "down";
  return direction === "up";
}
