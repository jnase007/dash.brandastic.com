import { metricDeltas } from "./compare";
import { money, pct, ratio } from "./format";
import type { PortfolioSummary } from "./types";

export type InboxItem = {
  id: string;
  severity: "high" | "medium" | "positive" | "info";
  title: string;
  body: string;
  href: string;
  clientName?: string;
  metric?: string;
};

/**
 * Operator inbox built from live portfolio + prior-period deltas.
 * Prefer real previousTotals/previous on clients over synthetic guesses.
 */
export function buildOperatorInbox(
  portfolio: PortfolioSummary,
  opts?: { limit?: number }
): InboxItem[] {
  const limit = opts?.limit ?? 12;
  const items: InboxItem[] = [];
  const rangeQ = encodeURIComponent(portfolio.range);

  // Platform holes
  if (portfolio.connection.meta === "missing") {
    items.push({
      id: "meta-missing",
      severity: "high",
      title: "Meta not connected",
      body: "META token missing — Meta channel is offline for the whole portfolio.",
      href: "/clients",
      metric: "Meta",
    });
  }
  if (portfolio.connection.google === "missing") {
    items.push({
      id: "google-missing",
      severity: "high",
      title: "Google Ads not connected",
      body: "Google credentials missing — Google channel is offline.",
      href: "/clients",
      metric: "Google",
    });
  } else if (portfolio.connection.google === "blocked") {
    items.push({
      id: "google-blocked",
      severity: "medium",
      title: "Google live pull blocked",
      body: "OAuth may be present but live Google pulls are paused/blocked.",
      href: "/google",
      metric: "Google",
    });
  }

  for (const c of portfolio.clients) {
    const slug = c.client.slug;
    const name = c.client.name;
    const dash = `/clients/${slug}?range=${rangeQ}`;
    const report = `/reports/${slug}?range=${rangeQ}`;

    if (!c.client.metaAccountId) {
      items.push({
        id: `${slug}-meta-map`,
        severity: "medium",
        title: `${name}: Meta unmapped`,
        body: "No Meta act ID — coverage gap on paid social.",
        href: dash,
        clientName: name,
        metric: "Meta",
      });
    }
    if (!c.client.googleCustomerId) {
      items.push({
        id: `${slug}-gads-map`,
        severity: "medium",
        title: `${name}: Google unmapped`,
        body: "No Google customer ID — coverage gap on search/PMax.",
        href: dash,
        clientName: name,
        metric: "Google",
      });
    }
    if (!c.client.domain) {
      items.push({
        id: `${slug}-seo-map`,
        severity: "info",
        title: `${name}: SEO domain missing`,
        body: "Semrush cannot score this client until a domain is set.",
        href: `/seo/${slug}`,
        clientName: name,
        metric: "SEO",
      });
    }

    if (c.source === "demo" && c.client.status !== "setup") {
      items.push({
        id: `${slug}-no-live`,
        severity: "medium",
        title: `${name}: no live paid data`,
        body: (c.notes || []).join(" · ") || "Pull returned empty / unmapped.",
        href: dash,
        clientName: name,
      });
    }

    const prev = c.previous?.combined;
    const deltas =
      prev && c.previous?.source !== "unavailable"
        ? metricDeltas(c.combined, prev)
        : null;

    if (c.combined.spend > 0 && c.combined.conversions === 0) {
      items.push({
        id: `${slug}-zero-conv`,
        severity: "high",
        title: `${name}: spend with 0 conversions`,
        body: `${money(c.combined.spend)} spent and no conversions in range — check tracking or pause waste.`,
        href: report,
        clientName: name,
        metric: money(c.combined.spend),
      });
    }

    if (c.combined.cpa != null && c.combined.cpa > 150 && c.combined.spend > 100) {
      items.push({
        id: `${slug}-cpa`,
        severity: "high",
        title: `${name}: CPA ${money(c.combined.cpa)}`,
        body: "Blended CPA is elevated — open channel report before the next client touch.",
        href: report,
        clientName: name,
        metric: `CPA ${money(c.combined.cpa)}`,
      });
    }

    if (deltas?.spend.pct != null && deltas.spend.pct >= 0.35 && c.combined.spend > 50) {
      items.push({
        id: `${slug}-spend-up`,
        severity: "medium",
        title: `${name}: spend +${Math.round(deltas.spend.pct * 100)}% vs prior`,
        body: `${money(c.combined.spend)} now vs ${money(prev!.spend)} prior window.`,
        href: report,
        clientName: name,
        metric: money(c.combined.spend),
      });
    }

    if (
      deltas?.conversions.pct != null &&
      deltas.conversions.pct <= -0.25 &&
      (prev?.conversions || 0) >= 5
    ) {
      items.push({
        id: `${slug}-conv-down`,
        severity: "high",
        title: `${name}: conversions ${Math.round(deltas.conversions.pct * 100)}% vs prior`,
        body: `${c.combined.conversions} conv now vs ${prev!.conversions} prior — review winners/losers.`,
        href: report,
        clientName: name,
        metric: `${c.combined.conversions} conv`,
      });
    }

    if (
      deltas?.cpa.pct != null &&
      deltas.cpa.direction === "up" &&
      deltas.cpa.pct >= 0.25 &&
      c.combined.cpa != null
    ) {
      items.push({
        id: `${slug}-cpa-up`,
        severity: "medium",
        title: `${name}: CPA worsening`,
        body: `CPA ${money(c.combined.cpa)} (${pct(deltas.cpa.pct)} vs prior).`,
        href: report,
        clientName: name,
        metric: money(c.combined.cpa),
      });
    }

    if (
      c.combined.roas != null &&
      c.combined.roas >= 3 &&
      c.combined.spend > 100 &&
      c.combined.conversions >= 5
    ) {
      items.push({
        id: `${slug}-winner`,
        severity: "positive",
        title: `${name}: strong ROAS ${ratio(c.combined.roas)}`,
        body: "Protect and document — candidate to scale carefully.",
        href: report,
        clientName: name,
        metric: ratio(c.combined.roas),
      });
    }

    // Top campaign waste signal
    const top = [...c.campaigns]
      .filter((camp) => camp.metrics.spend > 75)
      .sort((a, b) => b.metrics.spend - a.metrics.spend)[0];
    if (top && top.metrics.conversions === 0) {
      items.push({
        id: `${slug}-camp-waste-${top.id}`,
        severity: "high",
        title: `${name}: top campaign has $0 conv`,
        body: `${top.name} spent ${money(top.metrics.spend)} with no conversions (${top.platform}).`,
        href: `/clients/${slug}/campaigns/${encodeURIComponent(top.id)}?range=${rangeQ}&platform=${top.platform}`,
        clientName: name,
        metric: money(top.metrics.spend),
      });
    }
  }

  const rank = { high: 0, medium: 1, positive: 3, info: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);

  // de-dupe by id
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return unique.slice(0, limit);
}
