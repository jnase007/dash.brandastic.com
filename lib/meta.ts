import type { CampaignRow, MetricSet } from "./types";
import { datePreset } from "./format";

const API_VERSION = process.env.META_API_VERSION || "v21.0";

export function metaConfigured() {
  return Boolean(process.env.META_ACCESS_TOKEN);
}

async function graph(path: string, params: Record<string, string> = {}) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN missing");

  const url = new URL(`https://graph.facebook.com/${API_VERSION}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Meta API ${res.status}`);
  }
  return json;
}

/** READ ONLY: list ad accounts visible to the token. */
export async function listMetaAdAccounts() {
  const json = await graph("/me/adaccounts", {
    fields: "id,account_id,name,account_status,currency,business_name",
    limit: "100",
  });
  return json.data || [];
}

function insightToMetrics(row: any): MetricSet {
  const spend = Number(row?.spend || 0);
  const impressions = Number(row?.impressions || 0);
  const clicks = Number(row?.clicks || 0);
  const actions = Array.isArray(row?.actions) ? row.actions : [];
  const conversions = actions
    .filter((a: any) =>
      [
        "lead",
        "purchase",
        "complete_registration",
        "offsite_conversion.fb_pixel_lead",
        "offsite_conversion.fb_pixel_purchase",
      ].includes(a.action_type)
    )
    .reduce((s: number, a: any) => s + Number(a.value || 0), 0);
  const purchaseValue = (row?.action_values || []).find((a: any) =>
    String(a.action_type || "").includes("purchase")
  );
  const revenue = Number(purchaseValue?.value || 0);
  return {
    spend,
    impressions,
    clicks,
    conversions,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : null,
    cpa: conversions ? spend / conversions : null,
    roas: spend ? revenue / spend : null,
  };
}

/** READ ONLY insights for one ad account. */
export async function fetchMetaAccountInsights(accountId: string, range: string) {
  const act = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const { since, until } = datePreset(range);

  const account = await graph(`/${act}/insights`, {
    fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
    time_range: JSON.stringify({ since, until }),
    level: "account",
  });

  const campaigns = await graph(`/${act}/insights`, {
    fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    time_range: JSON.stringify({ since, until }),
    level: "campaign",
    limit: "50",
  });

  const accountMetrics = insightToMetrics((account.data || [])[0] || {});
  const campaignRows: CampaignRow[] = (campaigns.data || []).map((row: any) => ({
    id: String(row.campaign_id || row.campaign_name),
    name: row.campaign_name || "Untitled campaign",
    platform: "meta" as const,
    status: "ACTIVE",
    metrics: insightToMetrics(row),
  }));

  return { metrics: accountMetrics, campaigns: campaignRows };
}
