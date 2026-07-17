import type { CampaignRow, MetricSet } from "./types";
import { datePreset } from "./format";

/**
 * Google Ads connector (READ ONLY).
 * Uses REST searchStream once developer token + OAuth refresh are present.
 * Without credentials, callers should fall back to demo mode.
 */
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v21";

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

/**
 * Google credentials can be present while live Ads API is still blocked
 * (developer-token/project mismatch). Default OFF until GOOGLE_ADS_LIVE=true.
 */
export function googleLiveEnabled() {
  if (!googleConfigured()) return false;
  const flag = (process.env.GOOGLE_ADS_LIVE || "").toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
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
  const { since, until, googleDuring } = datePreset(range);
  const cid = normalizeCustomerId(customerId);
  const loginCid = normalizeCustomerId(
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || customerId
  );

  // Prefer Google DURING presets (LAST_7_DAYS / LAST_30_DAYS) so dash matches Ads Manager.
  // Custom / 14d / 60d / 90d use explicit BETWEEN on complete reporting-TZ days.
  const dateClause = googleDuring
    ? `segments.date DURING ${googleDuring}`
    : `segments.date BETWEEN '${since}' AND '${until}'`;

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
    WHERE ${dateClause}
      AND campaign.status != 'REMOVED'
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cid}/googleAds:searchStream`,
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

  // Aggregate by campaign. searchStream returns one row per campaign×day when
  // segments.date is in the query — sum cost/value first, then derive ratios.
  const byCampaign = new Map<
    string,
    CampaignRow & { _convValue: number }
  >();
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
          ctr: 0,
          cpc: null,
          cpa: null,
          roas: null,
        },
        _convValue: value,
      });
    } else {
      const m = existing.metrics;
      m.spend += cost;
      m.impressions += imps;
      m.clicks += cl;
      m.conversions += conv;
      existing._convValue += value;
    }
  }

  for (const row of byCampaign.values()) {
    const m = row.metrics;
    m.ctr = m.impressions ? m.clicks / m.impressions : 0;
    m.cpc = m.clicks ? m.spend / m.clicks : null;
    m.cpa = m.conversions ? m.spend / m.conversions : null;
    m.roas = m.spend ? row._convValue / m.spend : null;
    delete (row as { _convValue?: number })._convValue;
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

  const campaigns: CampaignRow[] = Array.from(byCampaign.values()).map(
    ({ _convValue, ...rest }) => rest as CampaignRow
  );

  return { metrics, campaigns };
}

/** READ ONLY: list Google Ads customer IDs visible to the OAuth user. */
export async function listGoogleAccessibleCustomers() {
  if (!googleConfigured()) throw new Error("Google Ads not configured");
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Google Ads API ${res.status}`);
  }
  return (json.resourceNames || []).map((rn: string) =>
    String(rn).replace("customers/", "")
  );
}

/** READ ONLY: list client accounts under an MCC. */
export async function listGoogleMccClients(mccId?: string) {
  if (!googleConfigured()) throw new Error("Google Ads not configured");
  const accessToken = await getAccessToken();
  const mcc = normalizeCustomerId(
    mccId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ""
  );
  if (!mcc) throw new Error("GOOGLE_ADS_LOGIN_CUSTOMER_ID missing");

  const query = `
    SELECT
      customer_client.client_customer,
      customer_client.descriptive_name,
      customer_client.id,
      customer_client.level,
      customer_client.manager,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level <= 1
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${mcc}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "login-customer-id": mcc,
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

  const rows: any[] = [];
  const batches = Array.isArray(json) ? json : [json];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }

  return rows.map((r) => {
    const cc = r.customerClient || {};
    return {
      id: String(cc.id || ""),
      name: cc.descriptiveName || "",
      manager: Boolean(cc.manager),
      status: cc.status || "UNKNOWN",
      resource: cc.clientCustomer || "",
    };
  });
}
