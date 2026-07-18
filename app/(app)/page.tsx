import Link from "next/link";
import { Suspense } from "react";
import { ClientLogo } from "@/components/ClientLogo";
import { CoverageStrip } from "@/components/CoverageStrip";
import { InsightList } from "@/components/InsightList";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { metricDeltas, sparkFromPair } from "@/lib/compare";
import { buildPortfolioCoverage } from "@/lib/coverage";
import { getPortfolio } from "@/lib/data";
import {
  compactRangeLabel,
  money,
  normalizeRange,
  num,
  pct,
  previousRangeLabel,
  ratio,
} from "@/lib/format";
import { buildOperatorInbox } from "@/lib/inbox";
import { getPortfolioInsights } from "@/lib/insights";
import { getClientLogoMap } from "@/lib/logos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getPortfolio(range);
  const prev = data.previousTotals || null;
  const deltas = metricDeltas(data.totals, prev);
  const compareLabel =
    data.comparisonSource && data.comparisonSource !== "unavailable"
      ? `vs prior ${previousRangeLabel(range).toLowerCase()} · ${data.comparisonSource}`
      : "prior period unavailable";
  const coverage = buildPortfolioCoverage(data);
  const ai = await getPortfolioInsights(data, { limit: 20 });
  const insights = ai.insights;
  const priority = insights.filter((i) => i.severity === "high" || i.severity === "medium").slice(0, 6);
  const wins = insights.filter((i) => i.severity === "positive").slice(0, 3);
  const operatorInbox = buildOperatorInbox(data, { limit: 8 });
  const logos = await getClientLogoMap(data.clients.map((c) => c.client.slug));

  const ranked = [...data.clients]
    .filter((c) => c.combined.spend > 0)
    .sort((a, b) => (b.combined.cpa || 0) - (a.combined.cpa || 0));

  return (
    <div className="page-premium">
      <div className="topbar">
        <div>
          <div className="eyebrow">Priority Inbox</div>
          <h1>What needs attention today</h1>
          <p>
            Premium AgencyAnalytics replacement for Brandastic ·{" "}
            {compactRangeLabel(range)} · review-only
          </p>
        </div>
        <div className="top-actions">
          <StatusBadge status={data.mode} />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
          <Link href="/reports" className="btn primary">
            Client reports
          </Link>
        </div>
      </div>

      <div className="premium-hero">
        <div className="premium-hero-copy">
          <div className="pill-row" style={{ marginBottom: 12 }}>
            <span className="badge blue">Team workspace</span>
            <span className="badge muted">Client-branded reports</span>
            <span className="badge muted">AI recommendations</span>
          </div>
          <h2>
            Review Meta + Google like a private client war room —
            <span> not a generic BI tool.</span>
          </h2>
          <p>
            Start with the inbox, open a branded client report, and leave with
            clear next actions. No campaign edits from this app.
          </p>
          <div className="pill-row">
            <Link href="/insights" className="btn ghost">
              All AI insights
            </Link>
            <Link href="/clients" className="btn ghost">
              Browse clients
            </Link>
          </div>
        </div>
        <div className="premium-hero-visual audit-strip">
          <img src="/team/audit-embedded.jpg" alt="Brandastic office collaboration" />
          <div className="premium-hero-float">
            <img src="/team/co-justin.jpg" alt="Justin" />
            <div>
              <strong>Brandastic standard</strong>
              <span>Premium, fast, review-only</span>
            </div>
          </div>
        </div>
      </div>

      {data.mode !== "live" ? (
        <div className="notice">
          <strong>{data.mode === "demo" ? "Demo mode." : "Partial live data."}</strong>{" "}
          Connect Meta + Google tokens to fully replace AgencyAnalytics. UX and
          report flow are ready now.
        </div>
      ) : null}

      <div style={{ marginBottom: 16 }}>
        <CoverageStrip clients={coverage.clients} totals={coverage.totals} />
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard
          label="Total spend"
          value={money(data.totals.spend)}
          sub={compareLabel}
          delta={deltas.spend}
          deltaKey="spend"
          spark={sparkFromPair(prev?.spend, data.totals.spend)}
        />
        <MetricCard
          label="Clicks"
          value={num(data.totals.clicks)}
          sub={`CTR ${pct(data.totals.ctr)} · ${compareLabel}`}
          delta={deltas.clicks}
          deltaKey="clicks"
          spark={sparkFromPair(prev?.clicks, data.totals.clicks)}
        />
        <MetricCard
          label="Conversions"
          value={num(data.totals.conversions)}
          sub={`CPA ${money(data.totals.cpa)} · ${compareLabel}`}
          delta={deltas.conversions}
          deltaKey="conversions"
          spark={sparkFromPair(prev?.conversions, data.totals.conversions)}
        />
        <MetricCard
          label="Blended ROAS"
          value={ratio(data.totals.roas)}
          sub={`Impr. ${num(data.totals.impressions)} · ${compareLabel}`}
          delta={deltas.roas}
          deltaKey="roas"
          spark={sparkFromPair(prev?.roas ?? null, data.totals.roas)}
        />
      </div>

      <div className="card premium-panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow">Live signals · prior-period + coverage</div>
            <h3>Operator inbox</h3>
          </div>
          <span className="badge muted">{operatorInbox.length}</span>
        </div>
        {operatorInbox.length ? (
          <div className="operator-inbox">
            {operatorInbox.map((item) => (
              <Link key={item.id} href={item.href} className={`operator-item sev-${item.severity}`}>
                <div className="operator-item-top">
                  <strong>{item.title}</strong>
                  {item.metric ? <span className="badge muted">{item.metric}</span> : null}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {item.body}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">No operator flags in this range.</p>
        )}
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card premium-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                Needs attention · {ai.engine === "xai" ? "xAI Grok" : "rules"}
              </div>
              <h3>AI priority</h3>
            </div>
            <Link href="/insights" className="btn ghost">
              View all
            </Link>
          </div>
          <InsightList
            insights={priority}
            empty="No high/medium issues in this range. Check positive wins →"
          />
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card premium-panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Protect these</div>
                <h3>Winning signals</h3>
              </div>
            </div>
            <InsightList insights={wins} empty="No strong positive signals yet." />
          </div>

          <div className="card premium-panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Triage</div>
                <h3>Highest CPA clients</h3>
              </div>
            </div>
            {ranked.slice(0, 4).map((c, idx) => {
              const brand = clientBrand(c.client.slug);
              return (
                <Link
                  key={c.client.id}
                  href={`/reports/${c.client.slug}?range=${range}`}
                  className="client-row"
                >
                  <div className="client-row-left">
                    <div className="rank-chip">{idx + 1}</div>
                    <ClientLogo
                      slug={c.client.slug}
                      name={c.client.name}
                      monogram={brand.monogram}
                      accent={brand.accent}
                      logoUrl={logos[c.client.slug]}
                      size={40}
                      editable={false}
                    />
                    <div>
                      <div className="client-name">{c.client.name}</div>
                      <div className="client-meta">
                        Open report · {c.source}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontWeight: 800 }}>
                      CPA {money(c.combined.cpa)}
                    </div>
                    <div className="client-meta">{money(c.combined.spend)} spend</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card premium-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Portfolio</div>
              <h3>Clients</h3>
            </div>
            <Link href="/clients" className="btn ghost">
              View all
            </Link>
          </div>
          {data.clients.map((c) => {
            const brand = clientBrand(c.client.slug);
            return (
              <Link
                key={c.client.id}
                href={`/clients/${c.client.slug}?range=${range}`}
                className="client-row"
              >
                <div className="client-row-left">
                  <ClientLogo
                    slug={c.client.slug}
                    name={c.client.name}
                    monogram={brand.monogram}
                    accent={brand.accent}
                    logoUrl={logos[c.client.slug]}
                    size={40}
                    editable={false}
                  />
                  <div>
                    <div className="client-name">{c.client.name}</div>
                    <div className="client-meta">
                      {c.client.industry || "Client"} · {c.source}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontWeight: 800 }}>
                    {money(c.combined.spend)}
                  </div>
                  <div className="client-meta">
                    CPA {money(c.combined.cpa)} · ROAS {ratio(c.combined.roas)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card premium-panel">
            <div className="eyebrow">Connections</div>
            <h3 style={{ marginBottom: 12 }}>Data health</h3>
            <div className="client-row">
              <div>
                <div className="client-name">Meta Marketing API</div>
                <div className="client-meta">Read-only insights</div>
              </div>
              <StatusBadge status={data.connection.meta} />
            </div>
            <div className="client-row">
              <div>
                <div className="client-name">Google Ads API</div>
                <div className="client-meta">Read-only campaign metrics</div>
              </div>
              <StatusBadge status={data.connection.google} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Generated {new Date(data.generatedAt).toLocaleString()}
            </div>
          </div>

          <div className="card premium-cta">
            <div className="eyebrow">Client delivery</div>
            <h3>Custom reports that feel white-label</h3>
            <p>
              Each client gets a branded report with metrics, campaign detail,
              and AI next actions — ready for weekly reviews.
            </p>
            <div className="pill-row">
              <Link href="/reports" className="btn primary">
                Open reports
              </Link>
              <Link href="/insights" className="btn ghost">
                AI recommendations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
