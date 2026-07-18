import { CLIENTS } from "./clients";
import { googleConfigured, googleLiveEnabled } from "./google-ads";
import { metaConfigured } from "./meta";
import { clientSeoDomain, semrushConfigured } from "./semrush";
import type { ClientAccount, ClientSummary, PortfolioSummary } from "./types";

export type ChannelCoverageStatus =
  | "live"
  | "mapped"
  | "unmapped"
  | "error"
  | "blocked"
  | "missing-key"
  | "missing-domain"
  | "off";

export type ClientCoverage = {
  slug: string;
  name: string;
  meta: ChannelCoverageStatus;
  google: ChannelCoverageStatus;
  seo: ChannelCoverageStatus;
  domain: string | null;
  score: number; // 0-3 channels healthy-ish
  notes: string[];
};

function metaStatus(client: ClientAccount, summary?: ClientSummary | null): ChannelCoverageStatus {
  if (!metaConfigured()) return "missing-key";
  if (!client.metaAccountId) return "unmapped";
  if (!summary) return "mapped";
  if (summary.meta) return "live";
  if (summary.notes?.some((n) => /^Meta:/i.test(n))) return "error";
  return "mapped";
}

function googleStatus(
  client: ClientAccount,
  summary?: ClientSummary | null
): ChannelCoverageStatus {
  if (!googleConfigured()) return "missing-key";
  if (!googleLiveEnabled()) return "blocked";
  if (!client.googleCustomerId) return "unmapped";
  if (!summary) return "mapped";
  if (summary.google) return "live";
  if (summary.notes?.some((n) => /^Google:/i.test(n))) return "error";
  return "mapped";
}

function seoStatus(client: ClientAccount): ChannelCoverageStatus {
  if (!semrushConfigured()) return "missing-key";
  const domain = clientSeoDomain(client);
  if (!domain) return "missing-domain";
  return "mapped";
}

function scoreStatus(status: ChannelCoverageStatus) {
  if (status === "live" || status === "mapped") return 1;
  return 0;
}

export function buildClientCoverage(
  client: ClientAccount,
  summary?: ClientSummary | null
): ClientCoverage {
  const meta = metaStatus(client, summary);
  const google = googleStatus(client, summary);
  const seo = seoStatus(client);
  const domain = clientSeoDomain(client);
  const notes: string[] = [];
  if (meta === "unmapped") notes.push("Meta act ID missing");
  if (meta === "error") notes.push("Meta pull error");
  if (google === "unmapped") notes.push("Google customer ID missing");
  if (google === "blocked") notes.push("Google live pull paused");
  if (google === "error") notes.push("Google pull error");
  if (seo === "missing-domain") notes.push("SEO domain missing");
  if (seo === "missing-key") notes.push("Semrush key missing");
  if (meta === "missing-key") notes.push("Meta token missing");

  return {
    slug: client.slug,
    name: client.name,
    meta,
    google,
    seo,
    domain,
    score: scoreStatus(meta) + scoreStatus(google) + scoreStatus(seo),
    notes,
  };
}

export function buildPortfolioCoverage(portfolio?: PortfolioSummary | null) {
  const bySlug = new Map(
    (portfolio?.clients || []).map((c) => [c.client.slug, c] as const)
  );
  const clients = CLIENTS.map((c) =>
    buildClientCoverage(c, bySlug.get(c.slug) || null)
  );
  const totals = {
    clients: clients.length,
    metaLive: clients.filter((c) => c.meta === "live").length,
    metaMapped: clients.filter((c) => c.meta === "live" || c.meta === "mapped")
      .length,
    googleLive: clients.filter((c) => c.google === "live").length,
    googleMapped: clients.filter(
      (c) => c.google === "live" || c.google === "mapped"
    ).length,
    seoReady: clients.filter((c) => c.seo === "mapped" || c.seo === "live")
      .length,
    gaps: clients.filter((c) => c.score < 3 || c.notes.length).length,
  };
  return {
    generatedAt: new Date().toISOString(),
    platform: {
      meta: metaConfigured() ? ("connected" as const) : ("missing" as const),
      google: googleLiveEnabled()
        ? ("connected" as const)
        : googleConfigured()
          ? ("blocked" as const)
          : ("missing" as const),
      seo: semrushConfigured() ? ("connected" as const) : ("missing" as const),
    },
    totals,
    clients,
  };
}

export function coverageTone(status: ChannelCoverageStatus) {
  if (status === "live") return "good";
  if (status === "mapped") return "ok";
  if (status === "blocked") return "warn";
  if (status === "error") return "bad";
  return "muted";
}

export function coverageLabel(status: ChannelCoverageStatus) {
  switch (status) {
    case "live":
      return "Live";
    case "mapped":
      return "Mapped";
    case "unmapped":
      return "Unmapped";
    case "error":
      return "Error";
    case "blocked":
      return "Blocked";
    case "missing-key":
      return "No key";
    case "missing-domain":
      return "No domain";
    default:
      return "Off";
  }
}
