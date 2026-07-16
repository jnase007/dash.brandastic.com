import type {
  AdCreativeRow,
  CampaignDetail,
  CampaignRow,
  CreativeAsset,
  MetricSet,
} from "./types";
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

function firstText(items: any[] | undefined) {
  if (!Array.isArray(items) || !items.length) return undefined;
  const val = items[0]?.text ?? items[0]?.name ?? items[0]?.value;
  return val ? String(val) : undefined;
}

async function resolveImageHashes(act: string, hashes: string[]) {
  const unique = Array.from(new Set(hashes.filter(Boolean)));
  const map = new Map<string, string>();
  if (!unique.length) return map;

  // Graph supports hash lookup via adimages
  const json = await graph(`/${act}/adimages`, {
    hashes: JSON.stringify(unique),
    fields: "hash,url,permalink_url,name,width,height",
  });
  const data = json?.data || {};
  // response can be object keyed by hash or array
  if (Array.isArray(data)) {
    for (const row of data) {
      if (row?.hash && (row.url || row.permalink_url)) {
        map.set(String(row.hash), String(row.url || row.permalink_url));
      }
    }
  } else if (data && typeof data === "object") {
    for (const [hash, row] of Object.entries<any>(data)) {
      if (row?.url || row?.permalink_url) {
        map.set(String(hash), String(row.url || row.permalink_url));
      } else if ((row as any)?.hash && ((row as any).url || (row as any).permalink_url)) {
        map.set(String((row as any).hash), String((row as any).url || (row as any).permalink_url));
      }
    }
  }
  return map;
}

function collectHashes(creative: any): string[] {
  const hashes: string[] = [];
  if (creative?.image_hash) hashes.push(String(creative.image_hash));
  const oss = creative?.object_story_spec || {};
  if (oss?.link_data?.image_hash) hashes.push(String(oss.link_data.image_hash));
  if (Array.isArray(oss?.link_data?.child_attachments)) {
    for (const child of oss.link_data.child_attachments) {
      if (child?.image_hash) hashes.push(String(child.image_hash));
    }
  }
  if (Array.isArray(creative?.asset_feed_spec?.images)) {
    for (const img of creative.asset_feed_spec.images) {
      if (img?.hash) hashes.push(String(img.hash));
    }
  }
  return hashes;
}

function extractAssets(creative: any, hashMap: Map<string, string>): CreativeAsset[] {
  const assets: CreativeAsset[] = [];
  const seen = new Set<string>();
  const push = (asset: CreativeAsset) => {
    const key = asset.url || asset.thumbnailUrl || asset.name || Math.random().toString();
    if (seen.has(key)) return;
    seen.add(key);
    assets.push(asset);
  };

  if (creative?.image_url) {
    push({ type: "image", url: String(creative.image_url), thumbnailUrl: creative.thumbnail_url });
  }
  if (creative?.image_hash && hashMap.get(String(creative.image_hash))) {
    push({
      type: "image",
      url: hashMap.get(String(creative.image_hash)),
      thumbnailUrl: creative.thumbnail_url,
    });
  }

  const oss = creative?.object_story_spec || {};
  const linkData = oss?.link_data || {};
  if (linkData?.image_hash && hashMap.get(String(linkData.image_hash))) {
    push({
      type: Array.isArray(linkData.child_attachments) ? "carousel" : "image",
      url: hashMap.get(String(linkData.image_hash)),
      name: linkData.name || creative?.title,
    });
  }
  if (Array.isArray(linkData?.child_attachments)) {
    for (const child of linkData.child_attachments) {
      const url = child?.image_hash ? hashMap.get(String(child.image_hash)) : undefined;
      push({
        type: "carousel",
        url,
        thumbnailUrl: child?.picture,
        name: child?.name,
      });
    }
  }

  const afs = creative?.asset_feed_spec || {};
  if (Array.isArray(afs.images)) {
    for (const img of afs.images) {
      const url = img?.hash ? hashMap.get(String(img.hash)) : img?.url;
      push({ type: "image", url, name: img?.name });
    }
  }
  if (Array.isArray(afs.videos)) {
    for (const vid of afs.videos) {
      push({
        type: "video",
        thumbnailUrl: vid?.thumbnail_url || creative?.thumbnail_url,
        name: vid?.video_id ? `Video ${vid.video_id}` : "Video",
      });
    }
  }

  if (!assets.length && creative?.thumbnail_url) {
    push({
      type: creative?.video_id || afs?.videos?.length ? "video" : "image",
      thumbnailUrl: String(creative.thumbnail_url),
      url: creative.image_url ? String(creative.image_url) : undefined,
    });
  }

  return assets;
}

function extractCopy(creative: any) {
  const oss = creative?.object_story_spec || {};
  const linkData = oss?.link_data || {};
  const afs = creative?.asset_feed_spec || {};
  const primaryText =
    creative?.body ||
    linkData?.message ||
    firstText(afs?.bodies) ||
    undefined;
  const headline =
    creative?.title ||
    linkData?.name ||
    firstText(afs?.titles) ||
    undefined;
  const description =
    linkData?.description ||
    firstText(afs?.descriptions) ||
    undefined;
  const cta =
    creative?.call_to_action_type ||
    linkData?.call_to_action?.type ||
    (Array.isArray(afs?.call_to_action_types) ? afs.call_to_action_types[0] : undefined);
  const linkUrl =
    creative?.link_url ||
    linkData?.link ||
    afs?.link_urls?.[0]?.website_url ||
    afs?.link_urls?.[0]?.display_url ||
    undefined;
  return {
    primaryText: primaryText ? String(primaryText) : undefined,
    headline: headline ? String(headline) : undefined,
    description: description ? String(description) : undefined,
    cta: cta ? String(cta) : undefined,
    linkUrl: linkUrl ? String(linkUrl) : undefined,
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

/** READ ONLY campaign + ads + creative previews for one Meta campaign. */
export async function fetchMetaCampaignDetail(opts: {
  accountId: string;
  campaignId: string;
  range: string;
  clientSlug: string;
  clientName: string;
}): Promise<CampaignDetail> {
  const act = opts.accountId.startsWith("act_")
    ? opts.accountId
    : `act_${opts.accountId}`;
  const { since, until } = datePreset(opts.range);
  const notes: string[] = [];

  const campaignInsights = await graph(`/${act}/insights`, {
    fields:
      "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    time_range: JSON.stringify({ since, until }),
    level: "campaign",
    filtering: JSON.stringify([
      { field: "campaign.id", operator: "EQUAL", value: opts.campaignId },
    ]),
    limit: "1",
  });

  let campaignMeta: any = null;
  try {
    campaignMeta = await graph(`/${opts.campaignId}`, {
      fields: "id,name,status,effective_status,objective",
    });
  } catch (e: any) {
    notes.push(`Campaign metadata: ${e.message || "unavailable"}`);
  }

  const campRow = (campaignInsights.data || [])[0] || {};
  const campaign: CampaignRow = {
    id: opts.campaignId,
    name:
      campaignMeta?.name ||
      campRow.campaign_name ||
      `Campaign ${opts.campaignId}`,
    platform: "meta",
    status: campaignMeta?.effective_status || campaignMeta?.status || "UNKNOWN",
    objective: campaignMeta?.objective || undefined,
    metrics: campRow.campaign_id ? insightToMetrics(campRow) : emptyMetrics(),
  };

  const adsJson = await graph(`/${opts.campaignId}/ads`, {
    fields:
      "id,name,status,effective_status,creative{id,name,title,body,image_url,thumbnail_url,object_type,object_story_spec,asset_feed_spec,video_id,image_hash,link_url,call_to_action_type}",
    limit: "50",
  });

  const adInsights = await graph(`/${act}/insights`, {
    fields:
      "ad_id,ad_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    time_range: JSON.stringify({ since, until }),
    level: "ad",
    filtering: JSON.stringify([
      { field: "campaign.id", operator: "EQUAL", value: opts.campaignId },
    ]),
    limit: "50",
  });

  const metricsByAd = new Map<string, MetricSet>();
  for (const row of adInsights.data || []) {
    if (row?.ad_id) metricsByAd.set(String(row.ad_id), insightToMetrics(row));
  }

  const creatives = (adsJson.data || []).map((ad: any) => ad.creative || {});
  const allHashes = creatives.flatMap((c: any) => collectHashes(c));
  let hashMap = new Map<string, string>();
  try {
    hashMap = await resolveImageHashes(act, allHashes);
  } catch (e: any) {
    notes.push(`Creative images: ${e.message || "hash resolve failed"}`);
  }

  const ads: AdCreativeRow[] = (adsJson.data || []).map((ad: any) => {
    const creative = ad.creative || {};
    const copy = extractCopy(creative);
    const assets = extractAssets(creative, hashMap);
    return {
      id: String(ad.id),
      name: ad.name || `Ad ${ad.id}`,
      status: ad.effective_status || ad.status || "UNKNOWN",
      primaryText: copy.primaryText,
      headline: copy.headline,
      description: copy.description,
      cta: copy.cta,
      linkUrl: copy.linkUrl,
      metrics: metricsByAd.get(String(ad.id)) || emptyMetrics(),
      assets,
    };
  });

  // sort by spend desc
  ads.sort((a, b) => b.metrics.spend - a.metrics.spend);

  return {
    clientSlug: opts.clientSlug,
    clientName: opts.clientName,
    campaign,
    ads,
    range: opts.range,
    source: "live",
    notes: notes.length ? notes : undefined,
  };
}
