import type { Insight } from "./insights";
import type { PortfolioSummary } from "./types";
import { money, pct, ratio } from "./format";

const XAI_BASE = process.env.XAI_API_BASE || "https://api.x.ai/v1";
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.5";

export function xaiConfigured() {
  return Boolean(process.env.XAI_API_KEY);
}

function compactPortfolio(portfolio: PortfolioSummary) {
  return {
    range: portfolio.range,
    mode: portfolio.mode,
    totals: {
      spend: portfolio.totals.spend,
      clicks: portfolio.totals.clicks,
      conversions: portfolio.totals.conversions,
      ctr: portfolio.totals.ctr,
      cpa: portfolio.totals.cpa,
      roas: portfolio.totals.roas,
    },
    clients: portfolio.clients.map((c) => ({
      slug: c.client.slug,
      name: c.client.name,
      status: c.client.status,
      source: c.source,
      combined: {
        spend: c.combined.spend,
        clicks: c.combined.clicks,
        conversions: c.combined.conversions,
        ctr: c.combined.ctr,
        cpa: c.combined.cpa,
        roas: c.combined.roas,
      },
      meta: c.meta
        ? {
            spend: c.meta.spend,
            conversions: c.meta.conversions,
            cpa: c.meta.cpa,
            roas: c.meta.roas,
            ctr: c.meta.ctr,
          }
        : null,
      google: c.google
        ? {
            spend: c.google.spend,
            conversions: c.google.conversions,
            cpa: c.google.cpa,
            roas: c.google.roas,
            ctr: c.google.ctr,
          }
        : null,
      topCampaigns: c.campaigns.slice(0, 5).map((camp) => ({
        id: camp.id,
        name: camp.name,
        platform: camp.platform,
        status: camp.status,
        spend: camp.metrics.spend,
        clicks: camp.metrics.clicks,
        conversions: camp.metrics.conversions,
        cpa: camp.metrics.cpa,
        roas: camp.metrics.roas,
        ctr: camp.metrics.ctr,
      })),
    })),
  };
}

function normalizeSeverity(raw: any): Insight["severity"] {
  const s = String(raw || "").toLowerCase();
  if (s === "high" || s === "critical" || s === "urgent") return "high";
  if (s === "positive" || s === "win" || s === "good") return "positive";
  if (s === "low" || s === "info") return "low";
  return "medium";
}

function normalizePlatform(raw: any): Insight["platform"] | undefined {
  const p = String(raw || "").toLowerCase();
  if (p === "meta" || p === "facebook" || p === "instagram") return "meta";
  if (p === "google" || p === "search" || p === "pmax") return "google";
  if (p === "combined" || p === "blended" || p === "both") return "combined";
  return undefined;
}

function parseInsightsJson(content: string): Insight[] {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("No JSON array in xAI response");
  const arr = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("xAI response was not an array");

  return arr
    .map((row: any, idx: number): Insight | null => {
      if (!row?.title || !row?.recommendation) return null;
      return {
        id: String(row.id || `xai-${idx}`),
        clientSlug: row.clientSlug || undefined,
        clientName: row.clientName || undefined,
        platform: normalizePlatform(row.platform),
        severity: normalizeSeverity(row.severity),
        title: String(row.title).slice(0, 140),
        body: String(row.body || row.title).slice(0, 500),
        recommendation: String(row.recommendation).slice(0, 500),
        metricHint: row.metricHint ? String(row.metricHint).slice(0, 80) : undefined,
      };
    })
    .filter(Boolean) as Insight[];
}

/**
 * Generate portfolio AI insights via xAI Grok.
 * Review-only recommendations — never instruct campaign writes.
 */
export async function generateXaiPortfolioInsights(
  portfolio: PortfolioSummary,
  seedInsights: Insight[] = []
): Promise<{ insights: Insight[]; model: string; source: "xai" }> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY missing");

  const payload = compactPortfolio(portfolio);
  const seed = seedInsights.slice(0, 12).map((i) => ({
    severity: i.severity,
    clientName: i.clientName,
    title: i.title,
    metricHint: i.metricHint,
  }));

  const system = `You are Brandastic's senior paid media strategist for an internal ads review dashboard (dash.brandastic.com).
You analyze Meta + Google Ads performance and write sharp, practical recommendations.

Rules:
- READ / REVIEW ONLY. Never suggest the dashboard should edit, pause, enable, create, or push ads automatically.
- Humans apply changes in Meta Ads Manager / Google Ads.
- Be specific: name clients, campaigns, platforms, and metrics when available.
- Prefer actionable next steps over generic advice.
- Prioritize high-impact issues: high CPA, low ROAS, zero-conversion spend, creative fatigue signals, channel imbalance, tracking gaps.
- Include 1–3 positive wins when data supports them.
- Keep language executive-ready for agency + client reviews.
- Output ONLY a JSON array (no markdown, no prose outside JSON).

Each item schema:
{
  "id": "string-stable-id",
  "clientSlug": "optional-slug",
  "clientName": "optional name",
  "platform": "meta|google|combined",
  "severity": "high|medium|low|positive",
  "title": "short title",
  "body": "1-2 sentence diagnosis with numbers",
  "recommendation": "specific next action for humans",
  "metricHint": "short metric label like CPA $82"
}

Return 8–16 insights sorted by priority (high first, then medium, low, positive).`;

  const user = `Analyze this portfolio snapshot for range ${portfolio.range}.

PORTFOLIO_JSON:
${JSON.stringify(payload)}

RULE_BASED_SEED_FLAGS:
${JSON.stringify(seed)}

Write better AI insights grounded in the metrics. Use seed flags as hints, not as copy to rewrite blindly.
Format spend with dollars only in prose, not inventing data that is not present.`;

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    // cache AI output briefly so range pages stay snappy
    next: { revalidate: 900 },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `xAI API ${res.status}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Empty xAI completion");
  }

  const insights = parseInsightsJson(content);
  if (!insights.length) throw new Error("xAI returned zero parseable insights");

  // decorate ids so UI keys stay unique
  const stamped = insights.map((i, idx) => ({
    ...i,
    id: i.id.startsWith("xai-") ? i.id : `xai-${i.id || idx}`,
  }));

  return { insights: stamped, model: XAI_MODEL, source: "xai" };
}

export async function generateXaiClientNarrative(input: {
  clientName: string;
  range: string;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  bullets: string[];
}): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;

  const prompt = `Write a tight 2-sentence client-ready performance summary for ${input.clientName} over ${input.range}.
Spend ${money(input.spend)}, conversions ${input.conversions}, CPA ${money(input.cpa)}, ROAS ${ratio(input.roas)}.
Key flags: ${input.bullets.slice(0, 4).join(" | ") || "none"}.
Review-only tone. No claims of editing ads. Plain text only.`;

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You write concise paid media client summaries for Brandastic. Review-only, no fluff.",
        },
        { role: "user", content: prompt },
      ],
    }),
    next: { revalidate: 900 },
  });
  const json = await res.json();
  if (!res.ok) return null;
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : null;
}

export function portfolioMetricLine(portfolio: PortfolioSummary) {
  return `Spend ${money(portfolio.totals.spend)} · Conv ${portfolio.totals.conversions} · CPA ${money(portfolio.totals.cpa)} · ROAS ${ratio(portfolio.totals.roas)} · CTR ${pct(portfolio.totals.ctr)}`;
}
