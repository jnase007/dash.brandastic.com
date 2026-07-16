import type { CampaignRow, MetricSet } from "./types";
import { datePreset } from "./format";

/**
 * Google Ads connector (READ ONLY).
 * Uses REST searchStream once developer token + OAuth refresh are present.
 * Without credentials, callers should fall back to demo mode.
 */
export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || "Google OAuth token refresh failed");
  }
  return json.access_token as string;
}

function normalizeCustomerId(id: string) {
  return id.replace(/-/g, "");
}

export async function fetchGoogleCustomerInsights(customerId: string, range: string) {
  if (!googleConfigured()) throw new Error("Google Ads not configured");
  const accessToken = await getAccessToken();
  const { since, until } = datePreset(range);
  const cid = normalizeCustomerId(customerId);
  const loginCid = normalizeCustomerId(
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || customerId
  );

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status != 'REMOVED'
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${cid}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "login-customer-id": loginCid,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    }
  );

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Google Ads API ${res.status}`);
  }

  // searchStream returns an array of result batches
  const rows: any[] = [];
  const batches = Array.isArray(json) ? json : [json];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }

  // Aggregate by campaign
  const byCampaign = new Map<string, CampaignRow>();
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let convValue = 0;

  for (const r of rows) {
    const id = String(r.campaign?.id || "unknown");
    const cost = Number(r.metrics?.costMicros || 0) / 1_000_000;
    const imps = Number(r.metrics?.impressions || 0);
    const cl = Number(r.metrics?.clicks || 0);
    const conv = Number(r.metrics?.conversions || 0);
    const value = Number(r.metrics?.conversionsValue || 0);

    spend += cost;
    impressions += imps;
    clicks += cl;
    conversions += conv;
    convValue += value;

    const existing = byCampaign.get(id);
    if (!existing) {
      byCampaign.set(id, {
        id,
        name: r.campaign?.name || "Untitled",
        platform: "google",
        status: r.campaign?.status || "UNKNOWN",
        metrics: {
          spend: cost,
          impressions: imps,
          clicks: cl,
          conversions: conv,
          ctr: imps ? cl / imps : 0,
          cpc: cl ? cost / cl : null,
          cpa: conv ? cost / conv : null,
          roas: cost ? value / cost : null,
        },
      });
    } else {
      const m = existing.metrics;
      m.spend += cost;
      m.impressions += imps;
      m.clicks += cl;
      m.conversions += conv;
      m.ctr = m.impressions ? m.clicks / m.impressions : 0;
      m.cpc = m.clicks ? m.spend / m.clicks : null;
      m.cpa = m.conversions ? m.spend / m.conversions : null;
      m.roas = m.spend ? ((m.roas || 0) * (m.spend - cost) + value) / m.spend : null;
    }
  }

  const metrics: MetricSet = {
    spend,
    impressions,
    clicks,
    conversions,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : null,
    cpa: conversions ? spend / conversions : null,
    roas: spend ? convValue / spend : null,
  };

  return { metrics, campaigns: Array.from(byCampaign.values()) };
}
