import type { ClientSummary, MetricSet, PortfolioSummary } from "./types";
import { money, pct, ratio } from "./format";
import { generateXaiPortfolioInsights, xaiConfigured } from "./xai";

export type InsightSeverity = "high" | "medium" | "low" | "positive";

export type Insight = {
  id: string;
  clientSlug?: string;
  clientName?: string;
  platform?: "meta" | "google" | "combined";
  severity: InsightSeverity;
  title: string;
  body: string;
  recommendation: string;
  metricHint?: string;
};

function severityRank(s: InsightSeverity) {
  return { high: 0, medium: 1, low: 2, positive: 3 }[s];
}

function spendShare(part: MetricSet | null, total: MetricSet) {
  if (!part || !total.spend) return 0;
  return part.spend / total.spend;
}

export function buildClientInsights(summary: ClientSummary): Insight[] {
  const out: Insight[] = [];
  const { client, combined, meta, google, campaigns, range } = summary;
  const base = {
    clientSlug: client.slug,
    clientName: client.name,
  };

  if (client.status === "setup") {
    out.push({
      id: `${client.slug}-setup`,
      ...base,
      severity: "high",
      title: "Account mapping incomplete",
      body: `${client.name} is still in setup. Meta act_ / Google customer IDs are not fully wired, so AgencyAnalytics-style review is incomplete for this client.`,
      recommendation:
        "Add META_ACT_* and GADS_* IDs for this client, then re-check spend, CPA, and campaign status.",
      metricHint: "Setup",
    });
    return out;
  }

  if (!combined.spend) {
    out.push({
      id: `${client.slug}-no-spend`,
      ...base,
      severity: "medium",
      title: "No spend in range",
      body: `${client.name} shows $0 spend for ${range}. Either accounts are paused, unmapped, or the range has no delivery.`,
      recommendation:
        "Confirm the account IDs and whether campaigns are intentionally paused before reporting this as a performance issue.",
      metricHint: money(0),
    });
    return out;
  }

  if (combined.cpa != null && combined.cpa > 120) {
    out.push({
      id: `${client.slug}-high-cpa`,
      ...base,
      platform: "combined",
      severity: "high",
      title: "CPA is elevated",
      body: `${client.name} blended CPA is ${money(combined.cpa)} on ${combined.conversions} conversions (${range}). That is high enough to pressure ROAS and lead quality reviews.`,
      recommendation:
        "Review top-spend campaigns for weak CTR/CVR, tighten audiences or keywords, and compare Meta vs Google CPA side-by-side before shifting budget.",
      metricHint: `CPA ${money(combined.cpa)}`,
    });
  } else if (combined.cpa != null && combined.cpa < 45 && combined.conversions >= 10) {
    out.push({
      id: `${client.slug}-efficient-cpa`,
      ...base,
      platform: "combined",
      severity: "positive",
      title: "Efficient conversion cost",
      body: `${client.name} is converting at ${money(combined.cpa)} CPA with ${combined.conversions} conversions in ${range}.`,
      recommendation:
        "Protect winners: scale only after checking frequency, search impression share, and lead quality — not spend alone.",
      metricHint: `CPA ${money(combined.cpa)}`,
    });
  }

  if (combined.roas != null && combined.roas < 1.5) {
    out.push({
      id: `${client.slug}-low-roas`,
      ...base,
      platform: "combined",
      severity: "high",
      title: "ROAS below efficient range",
      body: `Blended ROAS is ${ratio(combined.roas)} on ${money(combined.spend)} spend. This is a prime AgencyAnalytics-style flag for client reporting.`,
      recommendation:
        "Isolate non-converting campaigns, validate conversion tracking, and cut or rebuild low-ROAS placements before increasing budget.",
      metricHint: `ROAS ${ratio(combined.roas)}`,
    });
  } else if (combined.roas != null && combined.roas >= 3) {
    out.push({
      id: `${client.slug}-strong-roas`,
      ...base,
      platform: "combined",
      severity: "positive",
      title: "Strong return on ad spend",
      body: `${client.name} is at ${ratio(combined.roas)} ROAS for ${range}.`,
      recommendation:
        "Document what is working (offer, audience, creative, keyword theme) and package it into the client report as a scale recommendation.",
      metricHint: `ROAS ${ratio(combined.roas)}`,
    });
  }

  if (combined.ctr > 0 && combined.ctr < 0.008) {
    out.push({
      id: `${client.slug}-low-ctr`,
      ...base,
      platform: "combined",
      severity: "medium",
      title: "CTR looks soft",
      body: `CTR is ${pct(combined.ctr)} across ${combined.impressions.toLocaleString()} impressions. Creative/message fit may be weak.`,
      recommendation:
        "Refresh hooks and primary text, test 2–3 new angles, and pause ads with below-account CTR after enough spend.",
      metricHint: `CTR ${pct(combined.ctr)}`,
    });
  }

  if (meta && google) {
    const metaShare = spendShare(meta, combined);
    const googleShare = spendShare(google, combined);
    if (meta.cpa != null && google.cpa != null && meta.cpa > google.cpa * 1.45) {
      out.push({
        id: `${client.slug}-meta-vs-google-cpa`,
        ...base,
        platform: "combined",
        severity: "medium",
        title: "Meta CPA trails Google",
        body: `Meta CPA ${money(meta.cpa)} vs Google CPA ${money(google.cpa)}. Meta is taking ${pct(metaShare)} of spend.`,
        recommendation:
          "Shift testing budget toward the more efficient channel only after confirming conversion definitions match across platforms.",
        metricHint: `Meta ${money(meta.cpa)} · Google ${money(google.cpa)}`,
      });
    } else if (google.cpa != null && meta.cpa != null && google.cpa > meta.cpa * 1.45) {
      out.push({
        id: `${client.slug}-google-vs-meta-cpa`,
        ...base,
        platform: "combined",
        severity: "medium",
        title: "Google CPA trails Meta",
        body: `Google CPA ${money(google.cpa)} vs Meta CPA ${money(meta.cpa)}. Google is taking ${pct(googleShare)} of spend.`,
        recommendation:
          "Audit Search/PMax query themes and brand vs non-brand split before rebalancing budget toward Meta.",
        metricHint: `Google ${money(google.cpa)} · Meta ${money(meta.cpa)}`,
      });
    }
  } else if (meta && !google) {
    out.push({
      id: `${client.slug}-google-missing`,
      ...base,
      platform: "google",
      severity: "low",
      title: "Google Ads data missing",
      body: `${client.name} has Meta metrics but no Google Ads metrics in this view.`,
      recommendation:
        "Map the Google customer ID so client reports can show full-channel performance like AgencyAnalytics.",
      metricHint: "Google missing",
    });
  } else if (google && !meta) {
    out.push({
      id: `${client.slug}-meta-missing`,
      ...base,
      platform: "meta",
      severity: "low",
      title: "Meta data missing",
      body: `${client.name} has Google metrics but no Meta metrics in this view.`,
      recommendation:
        "Map the Meta ad account so blended CPA/ROAS and creative recommendations are complete.",
      metricHint: "Meta missing",
    });
  }

  const weakCampaigns = campaigns
    .filter((c) => c.metrics.spend >= 250 && (c.metrics.conversions || 0) === 0)
    .slice(0, 3);
  for (const c of weakCampaigns) {
    out.push({
      id: `${client.slug}-camp-${c.id}`,
      ...base,
      platform: c.platform,
      severity: "high",
      title: `Zero-conversion campaign: ${c.name}`,
      body: `${c.platform.toUpperCase()} campaign spent ${money(c.metrics.spend)} with 0 conversions in ${range}.`,
      recommendation:
        "Review tracking first. If tracking is clean, pause or rebuild creative/targeting before more spend accumulates.",
      metricHint: money(c.metrics.spend),
    });
  }

  const top = [...campaigns]
    .filter((c) => c.metrics.spend > 0)
    .sort((a, b) => b.metrics.spend - a.metrics.spend)[0];
  if (top && top.metrics.roas != null && top.metrics.roas >= 3) {
    out.push({
      id: `${client.slug}-top-winner`,
      ...base,
      platform: top.platform,
      severity: "positive",
      title: `Winner to scale carefully: ${top.name}`,
      body: `${top.platform.toUpperCase()} campaign is a top spender at ${money(top.metrics.spend)} with ${ratio(top.metrics.roas)} ROAS.`,
      recommendation:
        "Scale in steps (10–20%), watch CPA/frequency, and duplicate only after creative fatigue checks.",
      metricHint: `ROAS ${ratio(top.metrics.roas)}`,
    });
  }

  return out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

export function buildPortfolioInsights(portfolio: PortfolioSummary): Insight[] {
  const clientInsights = portfolio.clients.flatMap(buildClientInsights);
  const portfolioLevel: Insight[] = [];

  if (portfolio.mode !== "live") {
    portfolioLevel.push({
      id: "portfolio-connection",
      severity: "high",
      title: portfolio.mode === "demo" ? "Still on demo data" : "Partial live data",
      body:
        portfolio.mode === "demo"
          ? "Meta/Google tokens or account mappings are not fully connected, so this is not ready to fully replace AgencyAnalytics yet."
          : "Some accounts are live, but not every channel is connected across the portfolio.",
      recommendation:
        "Wire META_ACCESS_TOKEN + Google Ads OAuth/dev token + per-client account IDs, then validate one client end-to-end against AgencyAnalytics.",
      metricHint: portfolio.mode,
    });
  }

  if (portfolio.totals.spend > 0 && portfolio.totals.cpa != null && portfolio.totals.cpa > 100) {
    portfolioLevel.push({
      id: "portfolio-cpa",
      severity: "medium",
      title: "Portfolio CPA is elevated",
      body: `Blended portfolio CPA is ${money(portfolio.totals.cpa)} on ${money(portfolio.totals.spend)} spend.`,
      recommendation:
        "Sort clients by CPA and attack the top 2–3 offenders first in weekly review.",
      metricHint: `CPA ${money(portfolio.totals.cpa)}`,
    });
  }

  const rankedClients = [...portfolio.clients]
    .filter((c) => c.combined.spend > 0)
    .sort((a, b) => (b.combined.cpa || 0) - (a.combined.cpa || 0));
  if (rankedClients[0]?.combined.cpa) {
    const worst = rankedClients[0];
    portfolioLevel.push({
      id: "portfolio-worst-cpa",
      severity: "medium",
      clientSlug: worst.client.slug,
      clientName: worst.client.name,
      title: `Highest CPA client: ${worst.client.name}`,
      body: `${worst.client.name} is leading the portfolio in CPA at ${money(worst.combined.cpa)}.`,
      recommendation:
        "Open the client report, pull AI recommendations, and use that as the first agenda item in the next review.",
      metricHint: money(worst.combined.cpa),
    });
  }

  return [...portfolioLevel, ...clientInsights].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity)
  );
}

export function buildClientReportNarrative(summary: ClientSummary): {
  headline: string;
  summary: string;
  bullets: string[];
  nextActions: string[];
} {
  const insights = buildClientInsights(summary).slice(0, 5);
  const { client, combined, range } = summary;
  const headline = `${client.name} performance report · ${range}`;
  const summaryText = `${client.name} spent ${money(combined.spend)} with ${combined.conversions} conversions, ${money(combined.cpa)} CPA, and ${ratio(combined.roas)} ROAS over ${range}.`;
  const bullets = insights.map((i) => `${i.title}: ${i.body}`);
  const nextActions = insights.map((i) => i.recommendation).slice(0, 4);
  if (!nextActions.length) {
    nextActions.push(
      "Keep monitoring weekly spend, CPA, and ROAS; add live account IDs if any channel is missing."
    );
  }
  return { headline, summary: summaryText, bullets, nextActions };
}

export type InsightEngineResult = {
  insights: Insight[];
  engine: "xai" | "rules";
  model?: string;
  note?: string;
};

/**
 * Preferred insights path: xAI Grok when XAI_API_KEY is present,
 * otherwise deterministic rule engine (always available fallback).
 */
export async function getPortfolioInsights(
  portfolio: PortfolioSummary,
  opts: { limit?: number } = {}
): Promise<InsightEngineResult> {
  const limit = opts.limit ?? 24;
  const rules = buildPortfolioInsights(portfolio);

  if (!xaiConfigured()) {
    return {
      insights: rules.slice(0, limit),
      engine: "rules",
      note: "Rule engine active. Add XAI_API_KEY for Grok-powered recommendations.",
    };
  }

  try {
    const ai = await generateXaiPortfolioInsights(portfolio, rules);
    // Keep a couple of hard rule flags if AI omitted critical setup issues
    const criticalRules = rules
      .filter(
        (r) =>
          r.severity === "high" &&
          (r.id.includes("setup") ||
            r.id.includes("connection") ||
            r.id.includes("no-spend") ||
            r.title.toLowerCase().includes("zero-conversion"))
      )
      .slice(0, 4);

    const merged: Insight[] = [];
    const seen = new Set<string>();
    for (const item of [...ai.insights, ...criticalRules]) {
      const key = `${item.clientSlug || "p"}|${item.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    return {
      insights: merged.slice(0, limit),
      engine: "xai",
      model: ai.model,
      note: "Powered by xAI Grok · review-only recommendations",
    };
  } catch (e: any) {
    return {
      insights: rules.slice(0, limit),
      engine: "rules",
      note: `xAI unavailable (${e?.message || "error"}) · showing rule-based insights`,
    };
  }
}
