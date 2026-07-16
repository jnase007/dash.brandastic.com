import { CLIENTS, getClient } from "./clients";
import { buildDemoClient, buildDemoPortfolio, sumMetrics } from "./demo-data";
import { fetchGoogleCustomerInsights, googleConfigured } from "./google-ads";
import {
  fetchMetaAccountInsights,
  fetchMetaCampaignDetail,
  metaConfigured,
} from "./meta";
import type { CampaignDetail, ClientSummary, PortfolioSummary } from "./types";

function forceDemo() {
  return process.env.FORCE_DEMO_DATA === "true";
}

export async function getPortfolio(range = "30d"): Promise<PortfolioSummary> {
  const metaOk = metaConfigured();
  const googleOk = googleConfigured();

  if (forceDemo() || (!metaOk && !googleOk)) {
    const demo = buildDemoPortfolio(range);
    return demo;
  }

  const notes: string[] = [];

  // Parallel client pulls — serial Meta calls made /clients feel broken/slow.
  const settled = await Promise.allSettled(
    CLIENTS.map((client) => getClientSummary(client.slug, range))
  );
  const clients: ClientSummary[] = settled.map((result, i) => {
    const client = CLIENTS[i];
    if (result.status === "fulfilled") return result.value;
    const msg =
      result.reason?.message ||
      (typeof result.reason === "string" ? result.reason : "failed");
    notes.push(`${client.name}: ${msg}`);
    return buildDemoClient(client, range);
  });

  const totals = clients.reduce(
    (acc, c) => sumMetrics(acc, c.combined),
    sumMetrics(null, null)
  );

  const anyLive = clients.some((c) => c.source === "live" || c.source === "partial");
  return {
    range,
    totals,
    clients,
    connection: {
      meta: metaOk ? "connected" : "missing",
      google: googleOk ? "connected" : "missing",
    },
    generatedAt: new Date().toISOString(),
    mode: anyLive ? (metaOk && googleOk ? "live" : "partial") : "demo",
  };
}

export async function getClientSummary(
  slug: string,
  range = "30d"
): Promise<ClientSummary> {
  const client = getClient(slug);
  if (!client) throw new Error("Client not found");

  if (forceDemo() || (!metaConfigured() && !googleConfigured())) {
    return buildDemoClient(client, range);
  }

  let meta = null;
  let google = null;
  let metaCampaigns = [] as Awaited<
    ReturnType<typeof fetchMetaAccountInsights>
  >["campaigns"];
  let googleCampaigns = [] as Awaited<
    ReturnType<typeof fetchGoogleCustomerInsights>
  >["campaigns"];
  const notes: string[] = [];

  if (client.metaAccountId && metaConfigured()) {
    try {
      const res = await fetchMetaAccountInsights(client.metaAccountId, range);
      meta = res.metrics;
      metaCampaigns = res.campaigns;
    } catch (e: any) {
      notes.push(`Meta: ${e.message || "error"}`);
    }
  } else if (!client.metaAccountId) {
    notes.push("Meta account ID not mapped yet.");
  }

  if (client.googleCustomerId && googleConfigured()) {
    try {
      const res = await fetchGoogleCustomerInsights(client.googleCustomerId, range);
      google = res.metrics;
      googleCampaigns = res.campaigns;
    } catch (e: any) {
      // Google can be "configured" (OAuth present) but still blocked by
      // developer-token/project mismatch — keep Meta live and surface note.
      notes.push(`Google: ${e.message || "error"}`);
    }
  } else if (googleConfigured() && !client.googleCustomerId) {
    notes.push("Google Ads customer ID not mapped yet.");
  } else if (!googleConfigured()) {
    notes.push("Google Ads not fully connected yet.");
  }

  const source =
    meta || google
      ? meta && google
        ? "live"
        : "partial"
      : "demo";

  // If no live data, fall back to demo for review UI
  if (source === "demo") return buildDemoClient(client, range);

  return {
    client,
    range,
    meta,
    google,
    combined: sumMetrics(meta, google),
    campaigns: [...metaCampaigns, ...googleCampaigns].sort(
      (a, b) => b.metrics.spend - a.metrics.spend
    ),
    source,
    notes: notes.length ? notes : undefined,
  };
}

export async function getCampaignDetail(
  slug: string,
  campaignId: string,
  range = "30d",
  platform: "meta" | "google" = "meta"
): Promise<CampaignDetail> {
  const client = getClient(slug);
  if (!client) throw new Error("Client not found");

  if (platform === "google") {
    return {
      clientSlug: client.slug,
      clientName: client.name,
      campaign: {
        id: campaignId,
        name: `Google campaign ${campaignId}`,
        platform: "google",
        status: "UNKNOWN",
        metrics: sumMetrics(null, null),
      },
      ads: [],
      range,
      source: "partial",
      notes: [
        "Google Ads creative drill-down needs Google API credentials first.",
      ],
    };
  }

  if (!client.metaAccountId || !metaConfigured()) {
    // demo-ish fallback so UI still works
    return {
      clientSlug: client.slug,
      clientName: client.name,
      campaign: {
        id: campaignId,
        name: "Sample Meta campaign",
        platform: "meta",
        status: "ACTIVE",
        metrics: sumMetrics(null, null),
      },
      ads: [],
      range,
      source: "demo",
      notes: ["Meta not connected or account not mapped for this client."],
    };
  }

  return fetchMetaCampaignDetail({
    accountId: client.metaAccountId,
    campaignId,
    range,
    clientSlug: client.slug,
    clientName: client.name,
  });
}
