import Link from "next/link";
import { Suspense } from "react";
import { InsightList } from "@/components/InsightList";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { metricDeltas, previousMetrics } from "@/lib/compare";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel, money, num, pct, ratio } from "@/lib/format";
import { buildPortfolioInsights } from "@/lib/insights";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range || "30d";
  const data = await getPortfolio(range);
  const prev = previousMetrics(data.totals, 3);
  const deltas = metricDeltas(data.totals, prev);
  const insights = buildPortfolioInsights(data);
  const priority = insights.filter((i) => i.severity === "high" || i.severity === "medium").slice(0, 6);
  const wins = insights.filter((i) => i.severity === "positive").slice(0, 3);

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

      <div className="audit-photo-band">
        <div className="audit-photo-head">
          <div>
            <div className="eyebrow">From audit.brandastic.com</div>
            <h3>Team + office, real Brandastic</h3>
          </div>
          <p className="muted">Same partnership-model photography used on the audit site.</p>
        </div>
        <div className="audit-photo-grid">
          <figure className="audit-photo-card">
            <img src="/team/audit-embedded.jpg" alt="Embedded Partner" />
            <figcaption>
              <strong>Embedded Partner</strong>
              <span>Full-service war room energy</span>
            </figcaption>
          </figure>
          <figure className="audit-photo-card">
            <img src="/team/audit-extension.jpg" alt="Extension of Your Team" />
            <figcaption>
              <strong>Extension of Your Team</strong>
              <span>In-office collaboration</span>
            </figcaption>
          </figure>
          <figure className="audit-photo-card">
            <img src="/team/audit-project.jpg" alt="Project-Based" />
            <figcaption>
              <strong>Project-Based</strong>
              <span>Focused delivery sprints</span>
            </figcaption>
          </figure>
          <figure className="audit-photo-card">
            <img src="/team/audit-ondemand.jpg" alt="On-Demand" />
            <figcaption>
              <strong>On-Demand</strong>
              <span>Fast reviews, real people</span>
            </figcaption>
          </figure>
        </div>
      </div>

      {data.mode !== "live" ? (
        <div className="notice">
          <strong>{data.mode === "demo" ? "Demo mode." : "Partial live data."}</strong>{" "}
          Connect Meta + Google tokens to fully replace AgencyAnalytics. UX and
          report flow are ready now.
        </div>
      ) : null}

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard
          label="Total spend"
          value={money(data.totals.spend)}
          sub={`vs prior ${compactRangeLabel(range).toLowerCase()}`}
          delta={deltas.spend}
          deltaKey="spend"
          spark={[32, 30, 36, 40, 38, 44, 48]}
        />
        <MetricCard
          label="Clicks"
          value={num(data.totals.clicks)}
          sub={`CTR ${pct(data.totals.ctr)}`}
          delta={deltas.clicks}
          deltaKey="clicks"
          spark={[20, 24, 22, 28, 30, 27, 34]}
        />
        <MetricCard
          label="Conversions"
          value={num(data.totals.conversions)}
          sub={`CPA ${money(data.totals.cpa)}`}
          delta={deltas.conversions}
          deltaKey="conversions"
          spark={[12, 14, 13, 18, 17, 21, 24]}
        />
        <MetricCard
          label="Blended ROAS"
          value={ratio(data.totals.roas)}
          sub={`Impr. ${num(data.totals.impressions)}`}
          delta={deltas.roas}
          deltaKey="roas"
          spark={[18, 20, 19, 23, 25, 24, 28]}
        />
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card premium-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Needs attention</div>
              <h3>Priority inbox</h3>
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
                    <div
                      className="client-avatar"
                      style={{ background: brand.accent }}
                    >
                      {brand.monogram}
                    </div>
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
                  <div
                    className="client-avatar"
                    style={{ background: brand.accent }}
                  >
                    {brand.monogram}
                  </div>
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
