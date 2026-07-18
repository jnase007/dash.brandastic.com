export type Platform = "meta" | "google" | "combined";

export type ClientAccount = {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  /** Primary website domain for SEO (Semrush). */
  domain?: string;
  metaAccountId?: string;
  googleCustomerId?: string;
  status: "active" | "paused" | "setup";
};

export type MetricSet = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  cpc: number | null;
};

export type CampaignRow = {
  id: string;
  name: string;
  platform: "meta" | "google";
  status: string;
  objective?: string;
  metrics: MetricSet;
};

export type CreativeAsset = {
  type: "image" | "video" | "carousel" | "unknown";
  /** Best display URL (image full size, or video poster/source). */
  url?: string;
  thumbnailUrl?: string;
  /** Direct video file URL when Graph returns one. */
  videoUrl?: string;
  name?: string;
};

export type AdCreativeRow = {
  id: string;
  name: string;
  status: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
  linkUrl?: string;
  /** Facebook Page name when available (e.g. Equitymd). */
  pageName?: string;
  pagePictureUrl?: string;
  metrics: MetricSet;
  assets: CreativeAsset[];
};

export type CampaignDetail = {
  clientSlug: string;
  clientName: string;
  campaign: CampaignRow;
  ads: AdCreativeRow[];
  range: string;
  source: "live" | "demo" | "partial";
  notes?: string[];
};

export type ClientSummary = {
  client: ClientAccount;
  range: string;
  combined: MetricSet;
  meta: MetricSet | null;
  google: MetricSet | null;
  campaigns: CampaignRow[];
  source: "live" | "demo" | "partial";
  notes?: string[];
  /** Prior equal-length window metrics when live comparison succeeded. */
  previous?: {
    range: string;
    combined: MetricSet;
    meta: MetricSet | null;
    google: MetricSet | null;
    source: "live" | "partial" | "unavailable";
  };
};

export type PortfolioSummary = {
  range: string;
  totals: MetricSet;
  clients: ClientSummary[];
  connection: {
    meta: "connected" | "missing" | "error";
    google: "connected" | "missing" | "error" | "blocked";
  };
  generatedAt: string;
  mode: "live" | "demo" | "partial";
  notes?: string[];
  previousTotals?: MetricSet | null;
  previousRange?: string | null;
  comparisonSource?: "live" | "partial" | "unavailable";
};
