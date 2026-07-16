export type Platform = "meta" | "google" | "combined";

export type ClientAccount = {
  id: string;
  name: string;
  slug: string;
  industry?: string;
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

export type ClientSummary = {
  client: ClientAccount;
  range: string;
  combined: MetricSet;
  meta: MetricSet | null;
  google: MetricSet | null;
  campaigns: CampaignRow[];
  source: "live" | "demo" | "partial";
  notes?: string[];
};

export type PortfolioSummary = {
  range: string;
  totals: MetricSet;
  clients: ClientSummary[];
  connection: {
    meta: "connected" | "missing" | "error";
    google: "connected" | "missing" | "error";
  };
  generatedAt: string;
  mode: "live" | "demo" | "partial";
};
