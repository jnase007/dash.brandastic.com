import { metricDeltas, type Delta } from "./compare";
import { compareWindowSet, type CompareWindow } from "./compare-windows";
import { getClientSummary, getPortfolio } from "./data";
import { METRIC_COLUMNS, type MetricKey } from "./metric-columns";
import type { ClientSummary, MetricSet, PortfolioSummary } from "./types";

export type CompareChannel = "combined" | "meta" | "google";

export type CompareClientRow = {
  slug: string;
  name: string;
  industry?: string;
  source: ClientSummary["source"];
  notes?: string[];
  mapped: { meta: boolean; google: boolean };
  windows: Record<string, MetricSet | null>;
  deltas: Record<string, Record<MetricKey, Delta>>;
};

export type CompareBoard = {
  current: CompareWindow;
  windows: CompareWindow[];
  channel: CompareChannel;
  portfolio: Record<string, MetricSet | null>;
  portfolioDeltas: Record<string, Record<MetricKey, Delta>>;
  clients: CompareClientRow[];
  notes: string[];
  generatedAt: string;
};

function pickChannel(summary: ClientSummary | PortfolioSummary, channel: CompareChannel) {
  if ("totals" in summary) {
    if (channel === "combined") return summary.totals;
    const totals = summary.clients.reduce(
      (acc, client) => {
        const piece = channel === "meta" ? client.meta : client.google;
        if (!piece) return acc;
        return {
          spend: acc.spend + piece.spend,
          impressions: acc.impressions + piece.impressions,
          clicks: acc.clicks + piece.clicks,
          conversions: acc.conversions + piece.conversions,
        };
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );
    return {
      ...totals,
      ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      cpc: totals.clicks ? totals.spend / totals.clicks : null,
      cpa: totals.conversions ? totals.spend / totals.conversions : null,
      roas: null,
    } satisfies MetricSet;
  }
  if (channel === "meta") return summary.meta;
  if (channel === "google") return summary.google;
  return summary.combined;
}

function emptyDeltaMap() {
  return Object.fromEntries(
    METRIC_COLUMNS.map((col) => [col.key, { abs: null, pct: null, direction: "na" as const }])
  ) as Record<MetricKey, Delta>;
}

export async function getCompareBoard(
  currentRange: string,
  channel: CompareChannel = "combined"
): Promise<CompareBoard> {
  const windows = compareWindowSet(currentRange);
  const [current, previousMonth, previousYear] = await Promise.all([
    getPortfolio(windows.current.range, { includePrevious: false }),
    getPortfolio(windows.previousMonth.range, { includePrevious: false }),
    getPortfolio(windows.previousYear.range, { includePrevious: false }),
  ]);

  const byRange: Record<string, PortfolioSummary> = {
    [windows.current.range]: current,
    [windows.previousMonth.range]: previousMonth,
    [windows.previousYear.range]: previousYear,
  };

  const portfolio: Record<string, MetricSet | null> = {};
  for (const window of windows.all) {
    portfolio[window.id] = pickChannel(byRange[window.range], channel);
  }

  const portfolioDeltas: Record<string, Record<MetricKey, Delta>> = {
    previousMonth: emptyDeltaMap(),
    previousYear: emptyDeltaMap(),
  };
  if (portfolio.current) {
    portfolioDeltas.previousMonth = metricDeltas(
      portfolio.current,
      portfolio.previousMonth
    );
    portfolioDeltas.previousYear = metricDeltas(
      portfolio.current,
      portfolio.previousYear
    );
  }

  const clients: CompareClientRow[] = current.clients.map((row) => {
    const month = previousMonth.clients.find((c) => c.client.slug === row.client.slug);
    const year = previousYear.clients.find((c) => c.client.slug === row.client.slug);
    const windowMetrics = {
      current: pickChannel(row, channel),
      previousMonth: month ? pickChannel(month, channel) : null,
      previousYear: year ? pickChannel(year, channel) : null,
    };
    return {
      slug: row.client.slug,
      name: row.client.name,
      industry: row.client.industry,
      source: row.source,
      notes: row.notes,
      mapped: {
        meta: Boolean(row.client.metaAccountId),
        google: Boolean(row.client.googleCustomerId),
      },
      windows: windowMetrics,
      deltas: {
        previousMonth: windowMetrics.current
          ? metricDeltas(windowMetrics.current, windowMetrics.previousMonth)
          : emptyDeltaMap(),
        previousYear: windowMetrics.current
          ? metricDeltas(windowMetrics.current, windowMetrics.previousYear)
          : emptyDeltaMap(),
      },
    };
  });

  return {
    current: windows.current,
    windows: windows.all,
    channel,
    portfolio,
    portfolioDeltas,
    clients,
    notes: [
      ...(current.notes || []),
      ...(previousMonth.notes || []),
      ...(previousYear.notes || []),
    ].filter((note, i, arr) => arr.indexOf(note) === i),
    generatedAt: new Date().toISOString(),
  };
}

export async function getClientCompare(
  slug: string,
  currentRange: string,
  channel: CompareChannel = "combined"
) {
  const windows = compareWindowSet(currentRange);
  const [current, previousMonth, previousYear] = await Promise.all([
    getClientSummary(slug, windows.current.range),
    getClientSummary(slug, windows.previousMonth.range),
    getClientSummary(slug, windows.previousYear.range),
  ]);
  const metrics = {
    current: pickChannel(current, channel),
    previousMonth: pickChannel(previousMonth, channel),
    previousYear: pickChannel(previousYear, channel),
  };
  return {
    client: current.client,
    windows: windows.all,
    metrics,
    deltas: {
      previousMonth: metrics.current
        ? metricDeltas(metrics.current, metrics.previousMonth)
        : emptyDeltaMap(),
      previousYear: metrics.current
        ? metricDeltas(metrics.current, metrics.previousYear)
        : emptyDeltaMap(),
    },
  };
}
