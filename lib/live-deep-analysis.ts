import { CLIENTS, getClient } from "./clients";
import {
  anomalyBand,
  projectSeries,
  RESULT_GROUPS,
  sumDaily,
  type DailyPoint,
} from "./deep-analysis/metrics";
import { datePreset } from "./format";
import {
  fetchGoogleCustomerInsights,
  fetchGoogleDailyInsights,
  googleConfigured,
  googleLiveEnabled,
} from "./google-ads";
import {
  fetchMetaAccountInsights,
  fetchMetaDailyInsights,
  metaConfigured,
  type MetaDailyRow,
} from "./meta";
import type { GoogleDailyRow } from "./google-ads";
import { emptyMetrics } from "./metric-columns";
import type { CampaignRow, MetricSet } from "./types";

export type LiveDeepAccount = {
  platform: "meta" | "google";
  id: string;
  name: string;
  slug: string;
  currency?: string;
};

function dailyToMetrics(points: DailyPoint[]): MetricSet {
  const t = sumDaily(points);
  return {
    spend: t.spend,
    impressions: t.impressions,
    clicks: t.clicks,
    conversions: t.results,
    ctr: t.impressions ? t.clicks / t.impressions : 0,
    cpc: t.cpc,
    cpa: t.cpa,
    roas: t.roas,
  };
}

export function listLiveDeepAccounts(): LiveDeepAccount[] {
  const accounts: LiveDeepAccount[] = [];
  for (const client of CLIENTS) {
    if (client.metaAccountId) {
      accounts.push({
        platform: "meta",
        id: client.metaAccountId,
        name: client.name,
        slug: client.slug,
        currency: "USD",
      });
    }
    if (client.googleCustomerId) {
      accounts.push({
        platform: "google",
        id: client.googleCustomerId,
        name: client.name,
        slug: client.slug,
        currency: "USD",
      });
    }
  }
  return accounts;
}

export function liveDeepStatus() {
  const accounts = listLiveDeepAccounts();
  return {
    configured: metaConfigured() || googleLiveEnabled(),
    connection: {
      meta: metaConfigured() ? "connected" : "missing",
      google: googleLiveEnabled()
        ? "connected"
        : googleConfigured()
          ? "blocked"
          : "missing",
    },
    counts: {
      meta_accounts: accounts.filter((a) => a.platform === "meta").length,
      google_customers: accounts.filter((a) => a.platform === "google").length,
      clients: CLIENTS.length,
    },
    resultGroups: Object.entries(RESULT_GROUPS).map(([id, g]) => ({
      id,
      label: g.label,
      mode: g.mode,
    })),
  };
}

function decorateDaily(points: DailyPoint[]) {
  const spendBand = anomalyBand(points.map((p) => p.spend));
  const resultBand = anomalyBand(points.map((p) => p.results));
  return points.map((p, i) => {
    const cpa = p.results > 0 ? p.spend / p.results : null;
    const roas = p.spend > 0 ? p.revenue / p.spend : null;
    return {
      ...p,
      cpa,
      roas,
      anomaly: {
        flag: Boolean(spendBand[i]?.flag || resultBand[i]?.flag),
        spend: spendBand[i],
        results: resultBand[i],
      },
    };
  });
}

export async function getLiveDeepAnalysis(opts: {
  platform: "meta" | "google";
  accountId: string;
  range: string;
  resultGroup?: string;
}) {
  const resultGroup =
    opts.resultGroup && RESULT_GROUPS[opts.resultGroup]
      ? opts.resultGroup
      : "purchases";
  const account = listLiveDeepAccounts().find(
    (a) => a.platform === opts.platform && a.id === opts.accountId
  );
  const client =
    account ? getClient(account.slug) : getClient(opts.accountId);
  const range = datePreset(opts.range);
  const notes: string[] = [];
  let campaigns: CampaignRow[] = [];
  let daily: DailyPoint[] = [];
  let accountName = account?.name || client?.name || opts.accountId;

  if (opts.platform === "meta") {
    if (!metaConfigured()) throw new Error("Meta is not connected");
    if (!opts.accountId) throw new Error("Meta account required");
    const [insights, series] = await Promise.all([
      fetchMetaAccountInsights(opts.accountId, opts.range),
      fetchMetaDailyInsights(opts.accountId, opts.range, resultGroup),
    ]);
    campaigns = insights.campaigns;
    daily = series.map((row: MetaDailyRow) => ({
      date: row.date,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      results: row.results,
      revenue: row.revenue,
      reach: row.reach,
    }));
    if (series.some((row: MetaDailyRow) => row.matchedType)) {
      notes.push(
        `Meta results use ${RESULT_GROUPS[resultGroup].label} (${resultGroup}).`
      );
    }
  } else {
    if (!googleLiveEnabled()) {
      throw new Error(
        googleConfigured()
          ? "Google live pull is paused (GOOGLE_ADS_LIVE)."
          : "Google Ads is not connected"
      );
    }
    if (!opts.accountId) throw new Error("Google customer ID required");
    const [insights, series] = await Promise.all([
      fetchGoogleCustomerInsights(opts.accountId, opts.range),
      fetchGoogleDailyInsights(opts.accountId, opts.range),
    ]);
    campaigns = insights.campaigns;
    daily = series.map((row: GoogleDailyRow) => ({
      date: row.date,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      results: row.conversions,
      revenue: row.revenue,
    }));
    notes.push("Google results use conversions + conversion value from Ads API.");
  }

  const totals = sumDaily(daily);
  const decorated = decorateDaily(daily);
  const projection = {
    spend: projectSeries(daily.map((d) => d.spend)),
    results: projectSeries(daily.map((d) => d.results)),
    cpa: [] as number[],
  };
  projection.cpa = projection.spend.forecast.map((spend, i) => {
    const results = projection.results.forecast[i] || 0;
    return results > 0 ? spend / results : 0;
  });

  return {
    account: {
      platform: opts.platform,
      id: opts.accountId,
      name: accountName,
      slug: account?.slug || client?.slug || "",
    },
    range: {
      key: opts.range,
      since: range.since,
      until: range.until,
    },
    resultGroup,
    resultGroupLabel:
      opts.platform === "google"
        ? "Conversions"
        : RESULT_GROUPS[resultGroup]?.label || "Results",
    totals,
    metrics: daily.length ? dailyToMetrics(daily) : emptyMetrics(),
    daily: decorated,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      spend: c.metrics.spend,
      results: c.metrics.conversions,
      cpa: c.metrics.cpa,
      roas: c.metrics.roas,
    })),
    projection,
    notes,
    source: "live" as const,
  };
}
