import type {
  AdCreativeRow,
  CampaignDetail,
  CampaignRow,
  CreativeAsset,
  MetricSet,
} from "./types";
import { datePreset } from "./format";
import { proxiedMediaUrl } from "./media-proxy";

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

function extractAssets(
  creative: any,
  hashMap: Map<string, string>,
  extras?: {
    post?: any;
    videos?: Map<string, any>;
  }
): CreativeAsset[] {
  const assets: CreativeAsset[] = [];
  const seen = new Set<string>();
  const push = (asset: CreativeAsset) => {
    const key =
      asset.videoUrl ||
      asset.url ||
      asset.thumbnailUrl ||
      asset.name ||
      Math.random().toString();
    if (seen.has(key)) return;
    seen.add(key);
    assets.push(asset);
  };

  const pickVideo = (videoId?: string | null) => {
    if (!videoId || !extras?.videos) return null;
    return extras.videos.get(String(videoId)) || null;
  };

  const bestVideoThumb = (video: any): string | undefined => {
    const thumbs = Array.isArray(video?.thumbnails?.data)
      ? video.thumbnails.data
      : [];
    if (thumbs.length) {
      const preferred = thumbs.find((t: any) => t?.is_preferred && t?.uri);
      if (preferred?.uri) return String(preferred.uri);
      const largest = [...thumbs]
        .filter((t: any) => t?.uri)
        .sort(
          (a: any, b: any) =>
            Number(b?.width || 0) * Number(b?.height || 0) -
            Number(a?.width || 0) * Number(a?.height || 0)
        )[0];
      if (largest?.uri) return String(largest.uri);
    }
    if (video?.picture) return String(video.picture);
    return undefined;
  };

  const pushVideo = (videoId?: string | null, fallbackThumb?: string | null, name?: string) => {
    const video = pickVideo(videoId);
    const thumb =
      bestVideoThumb(video) ||
      fallbackThumb ||
      extras?.post?.full_picture ||
      creative?.thumbnail_url ||
      creative?.image_url ||
      undefined;
    const source = video?.source || undefined;
    push({
      type: "video",
      // Prefer poster/image URL in `url` so UI never treats the mp4 as an <img>.
      url: thumb || source || undefined,
      thumbnailUrl: thumb || undefined,
      videoUrl: source || undefined,
      name: name || (videoId ? `Video ${videoId}` : "Video"),
    });
  };

  // 1) Published post attachments (AgencyAnalytics-style: real feed creative)
  const post = extras?.post;
  if (post) {
    const attachments = post?.attachments?.data || [];
    for (const att of attachments) {
      const sub = att?.subattachments?.data || [];
      if (sub.length) {
        for (const child of sub) {
          const media = child?.media || {};
          const target = child?.target || {};
          if (target?.id && String(child?.type || "").includes("video")) {
            pushVideo(String(target.id), media?.image?.src, child?.title);
          } else if (media?.image?.src || child?.url) {
            push({
              type: "carousel",
              url: media?.image?.src || child?.url,
              thumbnailUrl: media?.image?.src,
              name: child?.title,
            });
          }
        }
      } else {
        const media = att?.media || {};
        const target = att?.target || {};
        const isVideo =
          String(att?.type || "").includes("video") ||
          Boolean(media?.source) ||
          Boolean(target?.id && creative?.video_id);
        if (isVideo) {
          pushVideo(
            target?.id || creative?.video_id,
            media?.image?.src || post?.full_picture,
            att?.title
          );
        } else if (media?.image?.src || att?.url || post?.full_picture) {
          push({
            type: "image",
            url: media?.image?.src || att?.url || post?.full_picture,
            thumbnailUrl: media?.image?.src || post?.full_picture,
            name: att?.title,
          });
        }
      }
    }
    if (!assets.length && post?.full_picture) {
      push({
        type: creative?.video_id ? "video" : "image",
        url: String(post.full_picture),
        thumbnailUrl: String(post.full_picture),
        videoUrl: pickVideo(creative?.video_id)?.source,
      });
    }
  }

  // 2) Creative-level image / hash
  if (creative?.image_url) {
    push({
      type: "image",
      url: String(creative.image_url),
      thumbnailUrl: creative.thumbnail_url ? String(creative.thumbnail_url) : undefined,
    });
  }
  if (creative?.image_hash && hashMap.get(String(creative.image_hash))) {
    push({
      type: "image",
      url: hashMap.get(String(creative.image_hash)),
      thumbnailUrl: creative.thumbnail_url ? String(creative.thumbnail_url) : undefined,
    });
  }

  // 3) object_story_spec (draft/spec path)
  const oss = creative?.object_story_spec || {};
  const linkData = oss?.link_data || {};
  const videoData = oss?.video_data || {};
  if (videoData?.video_id) {
    pushVideo(
      String(videoData.video_id),
      videoData?.image_url || creative?.thumbnail_url,
      videoData?.title
    );
  }
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
        url: url || child?.picture,
        thumbnailUrl: child?.picture,
        name: child?.name,
      });
    }
  }

  // 4) Dynamic creative asset feed
  const afs = creative?.asset_feed_spec || {};
  if (Array.isArray(afs.images)) {
    for (const img of afs.images) {
      const url = img?.hash ? hashMap.get(String(img.hash)) : img?.url;
      push({ type: "image", url, name: img?.name });
    }
  }
  if (Array.isArray(afs.videos)) {
    for (const vid of afs.videos) {
      pushVideo(vid?.video_id, vid?.thumbnail_url || creative?.thumbnail_url);
    }
  }

  // 5) Top-level video_id / thumbnail fallback
  // Only push creative.video_id if we actually resolved it (page videos often 400).
  if (creative?.video_id && pickVideo(String(creative.video_id))) {
    pushVideo(String(creative.video_id), creative?.thumbnail_url);
  }
  if (!assets.length && (creative?.thumbnail_url || creative?.image_url)) {
    const isVideoish = Boolean(
      creative?.video_id ||
        afs?.videos?.length ||
        creative?.object_story_spec?.video_data?.video_id
    );
    push({
      type: isVideoish ? "video" : "image",
      thumbnailUrl: creative?.thumbnail_url
        ? String(creative.thumbnail_url)
        : undefined,
      url: creative.image_url
        ? String(creative.image_url)
        : creative?.thumbnail_url
          ? String(creative.thumbnail_url)
          : undefined,
    });
  }

  // If we have a resolved video with source but only tiny creative thumbs were
  // pushed earlier, ensure the best resolved video asset is first.
  assets.sort((a, b) => {
    const score = (x: CreativeAsset) =>
      (x.videoUrl ? 8 : 0) +
      (x.thumbnailUrl && !/p64x64|p130x130|p160x160/i.test(x.thumbnailUrl) ? 4 : 0) +
      (x.type === "video" ? 2 : 0) +
      (x.url ? 1 : 0);
    return score(b) - score(a);
  });

  return assets;
}

function extractCopy(
  creative: any,
  extras?: {
    post?: any;
  }
) {
  const oss = creative?.object_story_spec || {};
  const linkData = oss?.link_data || {};
  const videoData = oss?.video_data || {};
  const afs = creative?.asset_feed_spec || {};
  const post = extras?.post || {};
  const postAttachments = post?.attachments?.data || [];
  const firstAtt = postAttachments[0] || {};

  const primaryText =
    creative?.body ||
    post?.message ||
    linkData?.message ||
    videoData?.message ||
    firstText(afs?.bodies) ||
    undefined;
  const headline =
    creative?.title ||
    firstAtt?.title ||
    linkData?.name ||
    videoData?.title ||
    firstText(afs?.titles) ||
    undefined;
  const description =
    firstAtt?.description ||
    linkData?.description ||
    videoData?.link_description ||
    firstText(afs?.descriptions) ||
    undefined;
  const cta =
    creative?.call_to_action_type ||
    firstAtt?.call_to_action?.type ||
    linkData?.call_to_action?.type ||
    videoData?.call_to_action?.type ||
    (Array.isArray(afs?.call_to_action_types) ? afs.call_to_action_types[0] : undefined);
  const linkUrl =
    creative?.link_url ||
    firstAtt?.url ||
    firstAtt?.unshimmed_url ||
    linkData?.link ||
    videoData?.call_to_action?.value?.link ||
    afs?.link_urls?.[0]?.website_url ||
    afs?.link_urls?.[0]?.display_url ||
    undefined;
  const pageId =
    oss?.page_id ||
    post?.from?.id ||
    creative?.actor_id ||
    creative?.object_id ||
    undefined;
  return {
    primaryText: primaryText ? String(primaryText) : undefined,
    headline: headline ? String(headline) : undefined,
    description: description ? String(description) : undefined,
    cta: cta ? String(cta) : undefined,
    linkUrl: linkUrl ? String(linkUrl) : undefined,
    pageId: pageId ? String(pageId) : undefined,
  };
}

async function resolvePublishedPosts(storyIds: string[]) {
  const unique = [...new Set(storyIds.filter(Boolean))];
  const map = new Map<string, any>();
  await Promise.all(
    unique.map(async (id) => {
      try {
        // effective_object_story_id is usually pageId_postId
        const post = await graph(`/${id}`, {
          fields:
            "id,message,full_picture,permalink_url,from{id,name,picture.width(200).height(200)},attachments{title,description,unshimmed_url,url,type,media{image{src},source},target{id},media_type,subattachments{data{title,description,type,url,media{image{src},source},target{id}}}}",
        });
        map.set(id, post);
      } catch {
        // Post lookup is best-effort; dynamic creatives / restricted posts may fail.
      }
    })
  );
  return map;
}

async function resolveVideos(videoIds: string[]) {
  const unique = [...new Set(videoIds.filter(Boolean))];
  const map = new Map<string, any>();
  await Promise.all(
    unique.map(async (id) => {
      try {
        // Ad-library / uploaded advideo IDs work with ads token.
        // Page video IDs often need pages_read_engagement and 400.
        const video = await graph(`/${id}`, {
          fields:
            "id,title,picture,source,length,format,thumbnails.limit(8){uri,is_preferred,width,height}",
        });
        map.set(id, video);
      } catch {
        // Video source may require pages_read_engagement / ads rights.
      }
    })
  );
  return map;
}

function collectVideoIds(creative: any): string[] {
  const ids: string[] = [];
  const oss = creative?.object_story_spec || {};
  // Prefer object_story_spec.video_data.video_id — this is the ad-upload video
  // that Marketing API can read (source + hi-res thumbs). creative.video_id is
  // often a page video node that 400s without pages_read_engagement.
  if (oss?.video_data?.video_id) ids.push(String(oss.video_data.video_id));
  const afs = creative?.asset_feed_spec || {};
  if (Array.isArray(afs.videos)) {
    for (const vid of afs.videos) {
      if (vid?.video_id) ids.push(String(vid.video_id));
    }
  }
  if (creative?.video_id) ids.push(String(creative.video_id));
  if (oss?.link_data?.video_id) ids.push(String(oss.link_data.video_id));
  return ids;
}

async function resolvePageProfiles(pageIds: string[]) {
  const unique = [...new Set(pageIds.filter(Boolean))];
  const map = new Map<string, { name?: string; pictureUrl?: string }>();
  await Promise.all(
    unique.map(async (id) => {
      let name: string | undefined;
      let pictureUrl: string | undefined;

      // Full page node often needs pages_read_engagement — try, but don't depend on it.
      try {
        const page = await graph(`/${id}`, {
          fields: "name,picture.width(200).height(200)",
        });
        if (page?.name) name = String(page.name);
        if (page?.picture?.data?.url) pictureUrl = String(page.picture.data.url);
      } catch {
        // fall through
      }

      // /picture?redirect=0 works with ads token even when page fields 400.
      if (!pictureUrl) {
        try {
          const pic = await graph(`/${id}/picture`, {
            redirect: "0",
            type: "large",
          });
          if (pic?.data?.url) pictureUrl = String(pic.data.url);
        } catch {
          // best-effort
        }
      }

      if (name || pictureUrl) {
        map.set(id, { name, pictureUrl });
      }
    })
  );
  return map;
}

/** Prefer Meta date_preset when it matches Ads Manager; else explicit time_range. */
function metaTimeParams(range: string): Record<string, string> {
  const { since, until, metaDatePreset } = datePreset(range);
  if (metaDatePreset) {
    return { date_preset: metaDatePreset };
  }
  return { time_range: JSON.stringify({ since, until }) };
}

/** READ ONLY insights for one ad account. */
export async function fetchMetaAccountInsights(accountId: string, range: string) {
  const act = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const timeParams = metaTimeParams(range);

  const account = await graph(`/${act}/insights`, {
    fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
    ...timeParams,
    level: "account",
  });

  const campaigns = await graph(`/${act}/insights`, {
    fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    ...timeParams,
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
  const timeParams = metaTimeParams(opts.range);
  const notes: string[] = [];

  const campaignInsights = await graph(`/${act}/insights`, {
    fields:
      "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    ...timeParams,
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
      "id,name,status,effective_status,creative{id,name,title,body,image_url,thumbnail_url,object_type,object_story_spec,asset_feed_spec,video_id,image_hash,link_url,call_to_action_type,actor_id,object_id,effective_object_story_id,effective_instagram_media_id}",
    limit: "50",
  });

  const adInsights = await graph(`/${act}/insights`, {
    fields:
      "ad_id,ad_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    ...timeParams,
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

  // AgencyAnalytics-style: resolve published post + video objects for real assets.
  const storyIds = creatives
    .map((c: any) => c?.effective_object_story_id)
    .filter(Boolean)
    .map(String);
  const videoIds = creatives.flatMap((c: any) => collectVideoIds(c));
  const [postMap, videoMap] = await Promise.all([
    resolvePublishedPosts(storyIds),
    resolveVideos(videoIds),
  ]);

  const pageIds = (adsJson.data || [])
    .map((ad: any) => {
      const creative = ad.creative || {};
      const post = creative.effective_object_story_id
        ? postMap.get(String(creative.effective_object_story_id))
        : undefined;
      return extractCopy(creative, { post }).pageId;
    })
    .filter(Boolean) as string[];
  const pageMap = await resolvePageProfiles(pageIds);

  const ads: AdCreativeRow[] = (adsJson.data || []).map((ad: any) => {
    const creative = ad.creative || {};
    const post = creative.effective_object_story_id
      ? postMap.get(String(creative.effective_object_story_id))
      : undefined;
    const copy = extractCopy(creative, { post });
    const assets = extractAssets(creative, hashMap, {
      post,
      videos: videoMap,
    });
    const pageFromPost = post?.from;
    const page = copy.pageId ? pageMap.get(copy.pageId) : undefined;
    const pagePictureRaw =
      page?.pictureUrl ||
      pageFromPost?.picture?.data?.url ||
      undefined;

    // Proxy FB CDN URLs — browsers often fail direct hotlinks (broken posters/avatars).
    const proxiedAssets = assets.map((asset) => ({
      ...asset,
      url: proxiedMediaUrl(asset.url) || asset.url,
      thumbnailUrl: proxiedMediaUrl(asset.thumbnailUrl) || asset.thumbnailUrl,
      videoUrl: proxiedMediaUrl(asset.videoUrl) || asset.videoUrl,
    }));

    return {
      id: String(ad.id),
      name: ad.name || `Ad ${ad.id}`,
      status: ad.effective_status || ad.status || "UNKNOWN",
      primaryText: copy.primaryText,
      headline: copy.headline,
      description: copy.description,
      cta: copy.cta,
      linkUrl: copy.linkUrl,
      pageName: page?.name || pageFromPost?.name || undefined,
      pagePictureUrl: proxiedMediaUrl(pagePictureRaw) || pagePictureRaw,
      metrics: metricsByAd.get(String(ad.id)) || emptyMetrics(),
      assets: proxiedAssets,
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
