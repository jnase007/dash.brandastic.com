import { getClient } from "./clients";
import { comparePeriodWindows, compactRangeLabel } from "./format";
import {
  DESS_WEEKLY_REVIEW,
  roas,
  type CampaignReview,
  type ChangeSet,
  type PeriodMetrics,
} from "./dess-weekly-review";
import {
  fetchGoogleDailyInsights,
  fetchGoogleReviewWindow,
  googleLiveEnabled,
  type GoogleDailyRow,
  type GoogleReviewCampaign,
  type GoogleReviewMetrics,
} from "./google-ads";

export type DessWeeklyLive = {
  clientSlug: string;
  clientName: string;
  title: string;
  periodLabel: string;
  compareYearLabel: string;
  compareMonthLabel: string;
  account: string;
  range: string;
  source: "live" | "snapshot";
  roas: number;
  conversionValue: {
    mtd: number;
    yoy: number;
    lmtd: number;
    yoyChange: number | null;
    momChange: number | null;
  };
  totals: CampaignReview;
  campaigns: CampaignReview[];
  daily: GoogleDailyRow[];
};

function emptyMetrics(): PeriodMetrics {
  return {
    cost: 0,
    impressions: 0,
    clicks: 0,
    cpc: 0,
    searchImpShare: null,
    convValue: 0,
    conversions: 0,
  };
}

function fromLive(row: GoogleReviewMetrics): PeriodMetrics {
  const clicks = row.clicks || 0;
  return {
    cost: row.cost,
    impressions: row.impressions,
    clicks,
    cpc: clicks ? row.cost / clicks : 0,
    searchImpShare: row.searchImpShare,
    convValue: row.convValue,
    conversions: row.conversions,
  };
}

function pctChange(now: number, prior: number): number | null {
  if (!prior && !now) return 0;
  if (!prior) return null;
  return (now - prior) / prior;
}

function shareChange(now: number | null, prior: number | null): number | null {
  if (now == null || prior == null) return null;
  return (now - prior) / 100;
}

function changes(now: PeriodMetrics, prior: PeriodMetrics): ChangeSet {
  return {
    cost: pctChange(now.cost, prior.cost),
    impressions: pctChange(now.impressions, prior.impressions),
    clicks: pctChange(now.clicks, prior.clicks),
    cpc: pctChange(now.cpc, prior.cpc),
    searchImpShare: shareChange(now.searchImpShare, prior.searchImpShare),
    convValue: pctChange(now.convValue, prior.convValue),
    conversions: pctChange(now.conversions || 0, prior.conversions || 0),
  };
}

function withConversions(m: PeriodMetrics): PeriodMetrics {
  return { ...m, conversions: m.conversions ?? 0 };
}

function snapshotFallback(range: string, windows: ReturnType<typeof comparePeriodWindows>): DessWeeklyLive {
  const campaigns = DESS_WEEKLY_REVIEW.campaigns.map((c) => ({
    ...c,
    mtd: withConversions(c.mtd),
    yoy: withConversions(c.yoy),
    lmtd: withConversions(c.lmtd),
    yoyChange: { ...c.yoyChange, conversions: null },
    momChange: { ...c.momChange, conversions: null },
  }));
  return {
    ...DESS_WEEKLY_REVIEW,
    periodLabel: windows.current.label,
    compareYearLabel: windows.yoy.label,
    compareMonthLabel: windows.mom.label,
    range,
    source: "snapshot",
    totals: {
      name: "Account",
      mtd: withConversions(DESS_WEEKLY_REVIEW.totals.mtd),
      yoy: withConversions(DESS_WEEKLY_REVIEW.totals.yoy),
      lmtd: withConversions(DESS_WEEKLY_REVIEW.totals.lmtd),
      yoyChange: {
        ...DESS_WEEKLY_REVIEW.totals.yoyChange,
        conversions: null,
      },
      momChange: {
        ...DESS_WEEKLY_REVIEW.totals.momChange,
        conversions: null,
      },
    },
    campaigns,
    daily: [],
  };
}

export async function loadDessWeeklyReview(range = "mtd"): Promise<DessWeeklyLive> {
  const windows = comparePeriodWindows(range);
  const client = getClient("dess-usa");
  const account = client?.googleCustomerId || process.env.GADS_DESS || "8877524330";

  if (!googleLiveEnabled() || !account) {
    return snapshotFallback(range, windows);
  }

  try {
    const [current, mom, yoy, daily] = await Promise.all([
      fetchGoogleReviewWindow(account, windows.current.range),
      fetchGoogleReviewWindow(account, windows.mom.range),
      fetchGoogleReviewWindow(account, windows.yoy.range),
      fetchGoogleDailyInsights(account, windows.current.range).catch(() => [] as GoogleDailyRow[]),
    ]);

    const momBy = new Map(mom.campaigns.map((c) => [c.id, c]));
    const yoyBy = new Map(yoy.campaigns.map((c) => [c.id, c]));
    const names = new Map<string, GoogleReviewCampaign>();
    for (const c of [...current.campaigns, ...mom.campaigns, ...yoy.campaigns]) {
      if (!names.has(c.id)) names.set(c.id, c);
    }

    const campaigns: CampaignReview[] = Array.from(names.values())
      .map((base) => {
        const now = fromLive(
          current.campaigns.find((c) => c.id === base.id) || {
            ...base,
            cost: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            convValue: 0,
            searchImpShare: null,
          }
        );
        const lastMonth = fromLive(
          momBy.get(base.id) || {
            ...base,
            cost: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            convValue: 0,
            searchImpShare: null,
          }
        );
        const lastYear = fromLive(
          yoyBy.get(base.id) || {
            ...base,
            cost: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            convValue: 0,
            searchImpShare: null,
          }
        );
        return {
          name: base.name,
          mtd: now,
          lmtd: lastMonth,
          yoy: lastYear,
          momChange: changes(now, lastMonth),
          yoyChange: changes(now, lastYear),
          newThisYear: lastYear.cost === 0 && now.cost > 0,
          inactive: now.cost === 0,
        };
      })
      .sort((a, b) => b.mtd.cost - a.mtd.cost);

    const totalsNow = fromLive(current.totals);
    const totalsMom = fromLive(mom.totals);
    const totalsYoy = fromLive(yoy.totals);
    const accountRoas = roas(totalsNow.cost, totalsNow.convValue) || 0;

    return {
      clientSlug: "dess-usa",
      clientName: "DESS USA",
      title: "Google weekly review",
      periodLabel: windows.current.label,
      compareYearLabel: windows.yoy.label,
      compareMonthLabel: windows.mom.label,
      account,
      range,
      source: "live",
      roas: accountRoas,
      conversionValue: {
        mtd: totalsNow.convValue,
        yoy: totalsYoy.convValue,
        lmtd: totalsMom.convValue,
        yoyChange: pctChange(totalsNow.convValue, totalsYoy.convValue),
        momChange: pctChange(totalsNow.convValue, totalsMom.convValue),
      },
      totals: {
        name: "Account",
        mtd: totalsNow,
        lmtd: totalsMom,
        yoy: totalsYoy,
        momChange: changes(totalsNow, totalsMom),
        yoyChange: changes(totalsNow, totalsYoy),
      },
      campaigns,
      daily,
    };
  } catch {
    return snapshotFallback(range, windows);
  }
}

export function rangeOrMtd(range?: string | null) {
  if (!range) return "mtd";
  return range;
}
