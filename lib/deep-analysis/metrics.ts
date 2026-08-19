/** Pure metric helpers for Deep Analysis. Never average ratios. */

export type DailyPoint = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  revenue: number;
  reach?: number | null;
};

export type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  revenue: number;
  reachSum: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  convRate: number | null;
  roas: number | null;
  aov: number | null;
  /** true when reach was summed (not unique) */
  reachNotAdditive: boolean;
};

export function sumDaily(points: DailyPoint[], { excludeDate }: { excludeDate?: string } = {}): Totals {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let results = 0;
  let revenue = 0;
  let reachSum = 0;
  let hasReach = false;

  for (const p of points) {
    if (excludeDate && p.date === excludeDate) continue;
    spend += p.spend || 0;
    impressions += p.impressions || 0;
    clicks += p.clicks || 0;
    results += p.results || 0;
    revenue += p.revenue || 0;
    if (p.reach != null) {
      reachSum += p.reach;
      hasReach = true;
    }
  }

  return {
    spend,
    impressions,
    clicks,
    results,
    revenue,
    reachSum: hasReach ? reachSum : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpa: results > 0 ? spend / results : null,
    convRate: clicks > 0 ? (results / clicks) * 100 : null,
    roas: spend > 0 ? revenue / spend : null,
    aov: results > 0 ? revenue / results : null,
    reachNotAdditive: hasReach,
  };
}

/** First-match-wins result groups. Leads are summed (disjoint). */
export const RESULT_GROUPS: Record<
  string,
  { label: string; mode: "first" | "sum"; types: string[] }
> = {
  purchases: {
    label: "Purchases",
    mode: "first",
    types: [
      "purchase",
      "omni_purchase",
      "offsite_conversion.fb_pixel_purchase",
      "onsite_web_purchase",
      "onsite_web_app_purchase",
      "web_in_store_purchase",
      "web_app_in_store_purchase",
      "onsite_conversion.purchase",
      "app_custom_event.fb_mobile_purchase",
    ],
  },
  leads: {
    label: "Leads",
    mode: "sum",
    types: [
      "lead",
      "onsite_conversion.lead_grouped",
      "onsite_conversion.lead",
      "offsite_conversion.fb_pixel_lead",
      "onsite_web_lead",
      "offsite_complete_registration_add_meta_leads",
    ],
  },
  messages: {
    label: "Messages",
    mode: "first",
    types: [
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.messaging_first_reply",
      "onsite_conversion.total_messaging_connection",
    ],
  },
  add_to_cart: {
    label: "Add to cart",
    mode: "first",
    types: [
      "add_to_cart",
      "omni_add_to_cart",
      "offsite_conversion.fb_pixel_add_to_cart",
      "onsite_web_add_to_cart",
      "onsite_web_app_add_to_cart",
    ],
  },
  checkout: {
    label: "Checkout initiated",
    mode: "first",
    types: [
      "initiate_checkout",
      "omni_initiated_checkout",
      "offsite_conversion.fb_pixel_initiate_checkout",
      "onsite_web_initiate_checkout",
    ],
  },
  link_clicks: {
    label: "Link clicks",
    mode: "first",
    types: ["link_click"],
  },
  landing_page_views: {
    label: "Landing page views",
    mode: "first",
    types: ["landing_page_view", "omni_landing_page_view"],
  },
  registrations: {
    label: "Registrations",
    mode: "first",
    types: [
      "complete_registration",
      "omni_complete_registration",
      "offsite_conversion.fb_pixel_complete_registration",
    ],
  },
};

export function resolveResultCount(
  byType: Record<string, { value: number; value_amount: number | null }>,
  groupKey: string
): { count: number; revenue: number; matchedType: string | null } {
  const group = RESULT_GROUPS[groupKey] || RESULT_GROUPS.purchases;
  if (group.mode === "sum") {
    let count = 0;
    let revenue = 0;
    for (const t of group.types) {
      const row = byType[t];
      if (!row) continue;
      count += row.value || 0;
      revenue += row.value_amount || 0;
    }
    return { count, revenue, matchedType: count ? "sum:" + groupKey : null };
  }
  for (const t of group.types) {
    const row = byType[t];
    if (row && (row.value || row.value_amount)) {
      return {
        count: row.value || 0,
        revenue: row.value_amount || 0,
        matchedType: t,
      };
    }
  }
  return { count: 0, revenue: 0, matchedType: null };
}

/**
 * Anomaly band: rolling mean ± k*stdev excluding the point under test.
 */
export function anomalyBand(
  values: number[],
  { window = 14, k = 2 }: { window?: number; k?: number } = {}
): Array<{ mean: number | null; low: number | null; high: number | null; flag: boolean }> {
  return values.map((_, i) => {
    const start = Math.max(0, i - window);
    const sample = values.slice(start, i).concat(values.slice(i + 1, i + 1 + window));
    // trailing window excluding i
    const trail: number[] = [];
    for (let j = i - window; j <= i + window; j++) {
      if (j < 0 || j >= values.length || j === i) continue;
      // prefer past-heavy: only use j < i for causal band
      if (j < i) trail.push(values[j]);
    }
    const use = trail.length >= 3 ? trail : sample.filter((_, idx) => start + idx !== i);
    if (use.length < 3) return { mean: null, low: null, high: null, flag: false };
    const mean = use.reduce((a, b) => a + b, 0) / use.length;
    const variance = use.reduce((a, b) => a + (b - mean) ** 2, 0) / use.length;
    const stdev = Math.sqrt(variance);
    const low = mean - k * stdev;
    const high = mean + k * stdev;
    const v = values[i];
    return { mean, low, high, flag: v < low || v > high };
  });
}

/** Simple MA-anchored level+slope projection for additive series. */
export function projectSeries(
  values: number[],
  horizon = 7
): { forecast: number[]; slope: number; level: number } {
  const n = values.length;
  if (n < 3) return { forecast: Array(horizon).fill(values[n - 1] || 0), slope: 0, level: values[n - 1] || 0 };
  // OLS slope
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  // MA anchor on last min(7,n)
  const w = Math.min(7, n);
  const ma = values.slice(n - w).reduce((a, b) => a + b, 0) / w;
  const xBarRecent = (n - w + n - 1) / 2;
  const level = ma - slope * xBarRecent;
  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    forecast.push(Math.max(0, level + slope * x));
  }
  return { forecast, slope, level };
}
