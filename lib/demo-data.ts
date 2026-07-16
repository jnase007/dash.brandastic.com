import type { ClientAccount, ClientSummary, MetricSet, PortfolioSummary } from "./types";
import { CLIENTS } from "./clients";

function metrics(seed: number): MetricSet {
  const spend = 1200 + seed * 830;
  const impressions = 42000 + seed * 18500;
  const clicks = 980 + seed * 210;
  const conversions = 18 + seed * 7;
  const ctr = clicks / impressions;
  const cpc = spend / clicks;
  const cpa = conversions ? spend / conversions : null;
  const roas = 2.1 + (seed % 5) * 0.35;
  return { spend, impressions, clicks, ctr, cpc, conversions, cpa, roas };
}

function empty(): MetricSet {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: null,
    conversions: 0,
    cpa: null,
    roas: null,
  };
}

export function buildDemoPortfolio(range: string): PortfolioSummary {
  const clients: ClientSummary[] = CLIENTS.map((client, i) => {
    const meta = client.status === "setup" ? null : metrics(i + 1);
    const google = client.status === "setup" ? null : metrics(i + 4);
    const combined = sumMetrics(meta, google);
    return {
      client,
      range,
      meta,
      google,
      combined,
      source: "demo",
      campaigns: [
        ...(meta
          ? [
              {
                id: `${client.id}-meta-1`,
                name: `${client.name} — Prospecting`,
                platform: "meta" as const,
                status: "ACTIVE",
                objective: "OUTCOME_LEADS",
                metrics: scale(meta, 0.58),
              },
              {
                id: `${client.id}-meta-2`,
                name: `${client.name} — Retargeting`,
                platform: "meta" as const,
                status: "ACTIVE",
                objective: "OUTCOME_SALES",
                metrics: scale(meta, 0.42),
              },
            ]
          : []),
        ...(google
          ? [
              {
                id: `${client.id}-g-1`,
                name: `${client.name} — Search Brand`,
                platform: "google" as const,
                status: "ENABLED",
                objective: "SEARCH",
                metrics: scale(google, 0.45),
              },
              {
                id: `${client.id}-g-2`,
                name: `${client.name} — PMax / Demand Gen`,
                platform: "google" as const,
                status: "ENABLED",
                objective: "PERFORMANCE_MAX",
                metrics: scale(google, 0.55),
              },
            ]
          : []),
      ],
      notes:
        client.status === "setup"
          ? ["Account mapping pending — add Meta act_ / Google customer ID."]
          : undefined,
    };
  });

  const totals = clients.reduce((acc, c) => sumMetrics(acc, c.combined), empty());

  return {
    range,
    totals,
    clients,
    connection: {
      meta: process.env.META_ACCESS_TOKEN ? "connected" : "missing",
      google:
        process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.GOOGLE_ADS_REFRESH_TOKEN
          ? "connected"
          : "missing",
    },
    generatedAt: new Date().toISOString(),
    mode: "demo",
  };
}

export function buildDemoClient(client: ClientAccount, range: string): ClientSummary {
  return (
    buildDemoPortfolio(range).clients.find((c) => c.client.id === client.id) || {
      client,
      range,
      meta: null,
      google: null,
      combined: empty(),
      campaigns: [],
      source: "demo",
    }
  );
}

function scale(m: MetricSet, factor: number): MetricSet {
  const spend = m.spend * factor;
  const impressions = Math.round(m.impressions * factor);
  const clicks = Math.round(m.clicks * factor);
  const conversions = Math.round(m.conversions * factor);
  return {
    spend,
    impressions,
    clicks,
    conversions,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : null,
    cpa: conversions ? spend / conversions : null,
    roas: m.roas,
  };
}

export function sumMetrics(a: MetricSet | null, b: MetricSet | null): MetricSet {
  const left = a || empty();
  const right = b || empty();
  const spend = left.spend + right.spend;
  const impressions = left.impressions + right.impressions;
  const clicks = left.clicks + right.clicks;
  const conversions = left.conversions + right.conversions;
  return {
    spend,
    impressions,
    clicks,
    conversions,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : null,
    cpa: conversions ? spend / conversions : null,
    roas:
      left.roas != null || right.roas != null
        ? ((left.roas || 0) * left.spend + (right.roas || 0) * right.spend) /
            Math.max(spend, 1) || null
        : null,
  };
}
