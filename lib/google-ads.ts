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

type GaqlRow = Record<string, any>;

async function googleSearchStream(customerId: string, query: string) {
  if (!googleConfigured()) throw new Error("Google Ads not configured");
  const accessToken = await getAccessToken();
  const cid = normalizeCustomerId(customerId);
  const loginCid = normalizeCustomerId(
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || customerId
  );

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
  const rows: GaqlRow[] = [];
  const batches = Array.isArray(json) ? json : [json];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }
  return rows;
}

function googleDateClause(range: string) {
  const { since, until, googleDuring } = datePreset(range);
  return googleDuring
    ? `segments.date DURING ${googleDuring}`
    : `segments.date BETWEEN '${since}' AND '${until}'`;
}

function emptyMetrics(): MetricSet {
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

function metricsFromParts(parts: {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  convValue?: number;
}): MetricSet {
  const { spend, impressions, clicks, conversions } = parts;
  const convValue = parts.convValue || 0;
  return {
    spend,
    impressions,
    clicks,
    conversions,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : null,
    cpa: conversions ? spend / conversions : null,
    roas: spend ? convValue / spend : null,
  };
}

function joinHeadlines(arr: any[] | undefined) {
  if (!Array.isArray(arr) || !arr.length) return undefined;
  const texts = arr
    .map((h) => (typeof h === "string" ? h : h?.text || h?.assetText || ""))
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  if (!texts.length) return undefined;
  // Prefer first 3 for preview density
  return texts.slice(0, 3).join(" · ");
}

function joinDescriptions(arr: any[] | undefined) {
  if (!Array.isArray(arr) || !arr.length) return undefined;
  const texts = arr
    .map((d) => (typeof d === "string" ? d : d?.text || d?.assetText || ""))
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  return texts[0] || undefined;
}

/**
 * READ ONLY: Google campaign detail with ad-level RSA copy + search terms.
 * Surfaces search ads as AdCreativeRow so the AA split preview works for Google.
 */
export async function fetchGoogleCampaignDetail(opts: {
  customerId: string;
  campaignId: string;
  range: string;
  clientSlug: string;
  clientName: string;
}): Promise<{
  clientSlug: string;
  clientName: string;
  campaign: CampaignRow;
  ads: import("./types").AdCreativeRow[];
  range: string;
  source: "live" | "partial";
  notes?: string[];
  searchTerms?: Array<{
    term: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
  }>;
}> {
  const { customerId, campaignId, range, clientSlug, clientName } = opts;
  const dateClause = googleDateClause(range);
  const notes: string[] = [];

  // Campaign rollup
  const campRows = await googleSearchStream(
    customerId,
    `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND ${dateClause}
    `
  );

  let campSpend = 0;
  let campImps = 0;
  let campClicks = 0;
  let campConv = 0;
  let campValue = 0;
  let campName = `Google campaign ${campaignId}`;
  let campStatus = "UNKNOWN";
  let channelType = "";
  for (const r of campRows) {
    campName = r.campaign?.name || campName;
    campStatus = r.campaign?.status || campStatus;
    channelType = r.campaign?.advertisingChannelType || channelType;
    campSpend += Number(r.metrics?.costMicros || 0) / 1_000_000;
    campImps += Number(r.metrics?.impressions || 0);
    campClicks += Number(r.metrics?.clicks || 0);
    campConv += Number(r.metrics?.conversions || 0);
    campValue += Number(r.metrics?.conversionsValue || 0);
  }

  // Ad-level metrics + RSA fields (ad_group_ad)
  let adRows: GaqlRow[] = [];
  try {
    adRows = await googleSearchStream(
      customerId,
      `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.expanded_text_ad.headline_part1,
        ad_group_ad.ad.expanded_text_ad.headline_part2,
        ad_group_ad.ad.expanded_text_ad.description,
        ad_group_ad.ad.image_ad.image_url,
        ad_group_ad.ad.image_ad.name,
        ad_group_ad.status,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM ad_group_ad
      WHERE campaign.id = ${campaignId}
        AND ${dateClause}
        AND ad_group_ad.status != 'REMOVED'
      `
    );
  } catch (e: any) {
    notes.push(`Google ads: ${e?.message || "ad pull failed"}`);
  }

  type Agg = {
    id: string;
    name: string;
    status: string;
    primaryText?: string;
    headline?: string;
    description?: string;
    linkUrl?: string;
    cta?: string;
    imageUrl?: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    convValue: number;
  };
  const byAd = new Map<string, Agg>();

  for (const r of adRows) {
    const ad = r.adGroupAd?.ad || {};
    const id = String(ad.id || "unknown");
    const rsa = ad.responsiveSearchAd || {};
    const eta = ad.expandedTextAd || {};
    const imageAd = ad.imageAd || {};
    const headlines =
      joinHeadlines(rsa.headlines) ||
      [eta.headlinePart1, eta.headlinePart2].filter(Boolean).join(" · ") ||
      undefined;
    const description =
      joinDescriptions(rsa.descriptions) || eta.description || undefined;
    const finalUrls = ad.finalUrls || [];
    const linkUrl = Array.isArray(finalUrls) ? finalUrls[0] : undefined;
    const imageUrl = imageAd.imageUrl || undefined;
    const cost = Number(r.metrics?.costMicros || 0) / 1_000_000;
    const imps = Number(r.metrics?.impressions || 0);
    const cl = Number(r.metrics?.clicks || 0);
    const conv = Number(r.metrics?.conversions || 0);
    const value = Number(r.metrics?.conversionsValue || 0);

    const existing = byAd.get(id);
    if (!existing) {
      byAd.set(id, {
        id,
        name:
          ad.name ||
          r.adGroup?.name ||
          headlines ||
          `Ad ${id}`,
        status: r.adGroupAd?.status || "UNKNOWN",
        primaryText: description,
        headline: headlines,
        description,
        linkUrl: linkUrl ? String(linkUrl) : undefined,
        cta: "LEARN_MORE",
        imageUrl: imageUrl ? String(imageUrl) : undefined,
        spend: cost,
        impressions: imps,
        clicks: cl,
        conversions: conv,
        convValue: value,
      });
    } else {
      existing.spend += cost;
      existing.impressions += imps;
      existing.clicks += cl;
      existing.conversions += conv;
      existing.convValue += value;
      if (!existing.headline && headlines) existing.headline = headlines;
      if (!existing.description && description) existing.description = description;
      if (!existing.linkUrl && linkUrl) existing.linkUrl = String(linkUrl);
      if (!existing.imageUrl && imageUrl) existing.imageUrl = String(imageUrl);
    }
  }

  const ads = Array.from(byAd.values())
    .map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      primaryText: a.primaryText || a.description,
      headline: a.headline || a.name,
      description: a.description,
      cta: a.cta,
      linkUrl: a.linkUrl,
      pageName: clientName,
      metrics: metricsFromParts({
        spend: a.spend,
        impressions: a.impressions,
        clicks: a.clicks,
        conversions: a.conversions,
        convValue: a.convValue,
      }),
      assets: a.imageUrl
        ? [
            {
              type: "image" as const,
              url: a.imageUrl,
              thumbnailUrl: a.imageUrl,
              name: a.name,
            },
          ]
        : [],
    }))
    .sort((x, y) => y.metrics.spend - x.metrics.spend);

  // Search terms (waste + winners) — best-effort
  let searchTerms: Array<{
    term: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
  }> = [];
  try {
    const stRows = await googleSearchStream(
      customerId,
      `
      SELECT
        search_term_view.search_term,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM search_term_view
      WHERE campaign.id = ${campaignId}
        AND ${dateClause}
            `
    );
    const byTerm = new Map<
      string,
      { term: string; spend: number; clicks: number; impressions: number; conversions: number }
    >();
    for (const r of stRows) {
      const term = String(r.searchTermView?.searchTerm || "").trim();
      if (!term) continue;
      const cost = Number(r.metrics?.costMicros || 0) / 1_000_000;
      const imps = Number(r.metrics?.impressions || 0);
      const cl = Number(r.metrics?.clicks || 0);
      const conv = Number(r.metrics?.conversions || 0);
      const existing = byTerm.get(term.toLowerCase());
      if (!existing) {
        byTerm.set(term.toLowerCase(), {
          term,
          spend: cost,
          clicks: cl,
          impressions: imps,
          conversions: conv,
        });
      } else {
        existing.spend += cost;
        existing.clicks += cl;
        existing.impressions += imps;
        existing.conversions += conv;
      }
    }
    searchTerms = Array.from(byTerm.values())
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 20);
  } catch (e: any) {
    notes.push(`Search terms: ${e?.message || "unavailable"}`);
  }

  if (!ads.length) {
    notes.push(
      channelType
        ? `No ad rows returned for ${channelType} in this range (RSA/image ads only on search/display where available).`
        : "No ad rows returned for this campaign/range."
    );
  }

  return {
    clientSlug,
    clientName,
    campaign: {
      id: String(campaignId),
      name: campName,
      platform: "google",
      status: campStatus,
      objective: channelType || undefined,
      metrics: metricsFromParts({
        spend: campSpend,
        impressions: campImps,
        clicks: campClicks,
        conversions: campConv,
        convValue: campValue,
      }),
    },
    ads,
    range,
    source: "live",
    notes: notes.length ? notes : undefined,
    searchTerms,
  };
}
