import { CLIENTS } from "./clients";
import type { ClientAccount } from "./types";

export type SemrushDomainOverview = {
  domain: string;
  database: string;
  rank: number | null;
  organicKeywords: number | null;
  organicTraffic: number | null;
  organicCost: number | null;
  adwordsKeywords: number | null;
  adwordsTraffic: number | null;
  adwordsCost: number | null;
};

export type SemrushKeywordRow = {
  keyword: string;
  position: number | null;
  previousPosition: number | null;
  positionDifference: number | null;
  searchVolume: number | null;
  cpc: number | null;
  url: string | null;
  trafficPercent: number | null;
  trafficCost: number | null;
  competition: number | null;
  trends: string | null;
};

export type SemrushClientSeo = {
  clientSlug: string;
  clientName: string;
  domain: string | null;
  database: string;
  configured: boolean;
  source: "live" | "missing-key" | "missing-domain" | "error";
  overview: SemrushDomainOverview | null;
  organicKeywords: SemrushKeywordRow[];
  notes: string[];
  fetchedAt: string;
};

const DEFAULT_DB = process.env.SEMRUSH_DATABASE || "us";

export function semrushConfigured() {
  return Boolean(process.env.SEMRUSH_API_KEY?.trim());
}

function apiKey() {
  return process.env.SEMRUSH_API_KEY?.trim() || "";
}

function domainEnvKey(slug: string) {
  return `SEO_DOMAIN_${slug.replace(/-/g, "_").toUpperCase()}`;
}

/** Primary domain for SEO pulls. Env override wins over client seed. */
export function clientSeoDomain(client: ClientAccount) {
  const fromEnv = process.env[domainEnvKey(client.slug)]?.trim();
  if (fromEnv) return normalizeDomain(fromEnv);
  if (client.domain) return normalizeDomain(client.domain);
  return null;
}

export function normalizeDomain(input: string) {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^www\./, "");
  value = value.split("/")[0] || value;
  value = value.split("?")[0] || value;
  return value || null;
}

function parseNumber(value?: string | null) {
  if (value == null || value === "" || value === "n/a") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  if (/^ERROR\b/i.test(lines[0])) {
    throw new Error(lines[0]);
  }
  const headers = lines[0].split(";").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(";"));
  return { headers, rows };
}

function rowMap(headers: string[], row: string[]) {
  const out: Record<string, string> = {};
  headers.forEach((h, i) => {
    const value = row[i] ?? "";
    out[h] = value;
    // also index by lowercase for resilient lookups
    out[h.toLowerCase()] = value;
  });
  return out;
}

/** Semrush returns full header labels, not short codes. */
function pick(m: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (m[key] != null && m[key] !== "") return m[key];
    const lower = key.toLowerCase();
    if (m[lower] != null && m[lower] !== "") return m[lower];
  }
  return "";
}

async function semrushGet(params: Record<string, string>) {
  const key = apiKey();
  if (!key) throw new Error("SEMRUSH_API_KEY missing");
  const qs = new URLSearchParams({ key, ...params });
  const url = `https://api.semrush.com/?${qs.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    next: { revalidate: 0 },
  } as RequestInit);
  const text = await res.text();
  if (!res.ok) throw new Error(`Semrush HTTP ${res.status}: ${text.slice(0, 180)}`);
  if (/^ERROR\b/i.test(text.trim())) throw new Error(text.trim().split("\n")[0]);
  return text;
}

export async function fetchDomainOverview(
  domain: string,
  database = DEFAULT_DB
): Promise<SemrushDomainOverview> {
  const text = await semrushGet({
    type: "domain_rank",
    domain,
    database,
    export_columns: "Dn,Rk,Or,Ot,Oc,Ad,At,Ac",
  });
  const { headers, rows } = parseCsv(text);
  const first = rows[0] ? rowMap(headers, rows[0]) : {};
  return {
    domain: pick(first, "Domain", "Dn") || domain,
    database,
    rank: parseNumber(pick(first, "Rank", "Rk")),
    organicKeywords: parseNumber(pick(first, "Organic Keywords", "Or")),
    organicTraffic: parseNumber(pick(first, "Organic Traffic", "Ot")),
    organicCost: parseNumber(pick(first, "Organic Cost", "Oc")),
    adwordsKeywords: parseNumber(pick(first, "Adwords Keywords", "Ad")),
    adwordsTraffic: parseNumber(pick(first, "Adwords Traffic", "At")),
    adwordsCost: parseNumber(pick(first, "Adwords Cost", "Ac")),
  };
}

export async function fetchOrganicKeywords(
  domain: string,
  database = DEFAULT_DB,
  limit = 20
): Promise<SemrushKeywordRow[]> {
  const text = await semrushGet({
    type: "domain_organic",
    domain,
    database,
    display_limit: String(Math.min(Math.max(limit, 1), 50)),
    display_sort: "tr_desc",
    export_columns: "Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Td",
  });
  const { headers, rows } = parseCsv(text);
  return rows.map((row) => {
    const m = rowMap(headers, row);
    return {
      keyword: pick(m, "Keyword", "Ph"),
      position: parseNumber(pick(m, "Position", "Po")),
      previousPosition: parseNumber(pick(m, "Previous Position", "Pp")),
      positionDifference: parseNumber(pick(m, "Position Difference", "Pd")),
      searchVolume: parseNumber(pick(m, "Search Volume", "Nq")),
      cpc: parseNumber(pick(m, "CPC", "Cp")),
      url: pick(m, "Url", "URL", "Ur") || null,
      trafficPercent: parseNumber(pick(m, "Traffic (%)", "Traffic", "Tr")),
      trafficCost: parseNumber(pick(m, "Traffic Cost (%)", "Traffic Cost", "Tc")),
      competition: parseNumber(pick(m, "Competition", "Co")),
      trends: pick(m, "Trends", "Td") || null,
    };
  });
}

export async function getClientSemrushSeo(
  client: ClientAccount,
  opts?: { keywordLimit?: number; database?: string }
): Promise<SemrushClientSeo> {
  const database = opts?.database || DEFAULT_DB;
  const domain = clientSeoDomain(client);
  const base = {
    clientSlug: client.slug,
    clientName: client.name,
    domain,
    database,
    configured: semrushConfigured(),
    overview: null as SemrushDomainOverview | null,
    organicKeywords: [] as SemrushKeywordRow[],
    notes: [] as string[],
    fetchedAt: new Date().toISOString(),
  };

  if (!semrushConfigured()) {
    return { ...base, source: "missing-key", notes: ["SEMRUSH_API_KEY not configured."] };
  }
  if (!domain) {
    return {
      ...base,
      source: "missing-domain",
      notes: [`No SEO domain mapped. Set SEO_DOMAIN_${client.slug.replace(/-/g, "_").toUpperCase()} or client.domain.`],
    };
  }

  try {
    const [overview, organicKeywords] = await Promise.all([
      fetchDomainOverview(domain, database),
      fetchOrganicKeywords(domain, database, opts?.keywordLimit ?? 20),
    ]);
    return {
      ...base,
      source: "live",
      overview,
      organicKeywords,
    };
  } catch (e: any) {
    return {
      ...base,
      source: "error",
      notes: [e?.message || "Semrush request failed"],
    };
  }
}

export async function getPortfolioSemrushSeo(opts?: {
  keywordLimit?: number;
  database?: string;
}) {
  const settled = await Promise.all(
    CLIENTS.map((c) => getClientSemrushSeo(c, opts))
  );
  return {
    configured: semrushConfigured(),
    database: opts?.database || DEFAULT_DB,
    clients: settled,
    fetchedAt: new Date().toISOString(),
  };
}
