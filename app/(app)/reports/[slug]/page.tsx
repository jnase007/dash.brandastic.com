import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientBrandHeader } from "@/components/ClientBrandHeader";
import { InsightList } from "@/components/InsightList";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { getClientSummary } from "@/lib/data";
import { compactRangeLabel, money, normalizeRange, num, pct, ratio } from "@/lib/format";
import { metricDeltas, previousMetrics } from "@/lib/compare";
import {
  buildClientInsights,
  buildClientReportNarrative,
} from "@/lib/insights";

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  if (!getClient(slug)) notFound();

  const data = await getClientSummary(slug, range);
  const insights = buildClientInsights(data);
  const narrative = buildClientReportNarrative(data);
  const prev = previousMetrics(data.combined, data.client.name.length);
  const deltas = metricDeltas(data.combined, prev);

  return (
    <div>
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <ClientBrandHeader
            name={data.client.name}
            slug={data.client.slug}
            industry={data.client.industry}
            rangeLabel={compactRangeLabel(range)}
          />
        </div>
        <div className="top-actions">
          <StatusBadge status={data.source} />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
          <Link className="btn ghost" href={`/clients/${slug}?range=${range}`}>
            Dashboard view
          </Link>
        </div>
      </div>

      <div className="report-channel-tabs">
        <Link
          href={`/reports/${slug}?range=${encodeURIComponent(range)}`}
          className="report-channel-tab active"
        >
          Blended
        </Link>
        <Link
          href={`/reports/${slug}/meta?range=${encodeURIComponent(range)}`}
          className="report-channel-tab"
        >
          Meta Ads
        </Link>
        <Link
          href={`/reports/${slug}/google?range=${encodeURIComponent(range)}`}
          className="report-channel-tab"
        >
          Google Ads
        </Link>
        <Link href={`/seo/${slug}`} className="report-channel-tab">
          SEO
        </Link>
      </div>

      <div className="notice">
        <strong>Custom client report.</strong> Use this as the AgencyAnalytics-style
        review page for {data.client.name}. Open Meta or Google tabs for channel-only
        reports. AI recommendations are review-only — apply changes in the ad platforms.
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <Link
          href={`/reports/${slug}/meta?range=${encodeURIComponent(range)}`}
          className="card report-channel-summary"
        >
          <div className="report-channel-summary-top">
            <span className="badge muted">Meta Ads</span>
            <span className="report-card-cta" style={{ marginTop: 0 }}>
              Open channel report →
            </span>
          </div>
          <div className="grid metrics" style={{ gap: 10, marginTop: 12 }}>
            <div>
              <div className="metric-label">Spend</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {money(data.meta?.spend)}
              </div>
            </div>
            <div>
              <div className="metric-label">Conv.</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {num(data.meta?.conversions)}
              </div>
            </div>
            <div>
              <div className="metric-label">CPA</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {money(data.meta?.cpa)}
              </div>
            </div>
            <div>
              <div className="metric-label">ROAS</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {ratio(data.meta?.roas)}
              </div>
            </div>
          </div>
        </Link>
        <Link
          href={`/reports/${slug}/google?range=${encodeURIComponent(range)}`}
          className="card report-channel-summary"
        >
          <div className="report-channel-summary-top">
            <span className="badge muted">Google Ads</span>
            <span className="report-card-cta" style={{ marginTop: 0 }}>
              Open channel report →
            </span>
          </div>
          <div className="grid metrics" style={{ gap: 10, marginTop: 12 }}>
            <div>
              <div className="metric-label">Spend</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {money(data.google?.spend)}
              </div>
            </div>
            <div>
              <div className="metric-label">Conv.</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {num(data.google?.conversions)}
              </div>
            </div>
            <div>
              <div className="metric-label">CPA</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {money(data.google?.cpa)}
              </div>
            </div>
            <div>
              <div className="metric-label">ROAS</div>
              <div className="metric-value" style={{ fontSize: 20 }}>
                {ratio(data.google?.roas)}
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Link href={`/seo/${slug}`} className="card report-channel-summary" style={{ display: "block" }}>
          <div className="report-channel-summary-top">
            <span className="badge muted">SEO · Semrush</span>
            <span className="report-card-cta" style={{ marginTop: 0 }}>
              Open SEO report →
            </span>
          </div>
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>
            Organic traffic, keyword rankings, and traffic value for this client domain.
          </p>
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>{narrative.headline}</h3>
        <p style={{ marginTop: 8, marginBottom: 12 }}>{narrative.summary}</p>
        <div className="pill-row">
          <span className="badge blue">Spend {money(data.combined.spend)}</span>
          <span className="badge blue">Conv. {num(data.combined.conversions)}</span>
          <span className="badge blue">CPA {money(data.combined.cpa)}</span>
          <span className="badge blue">ROAS {ratio(data.combined.roas)}</span>
          <span className="badge muted">CTR {pct(data.combined.ctr)}</span>
        </div>
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard
          label="Spend"
          value={money(data.combined.spend)}
          sub="vs prior period"
          delta={deltas.spend}
          deltaKey="spend"
        />
        <MetricCard
          label="Clicks"
          value={num(data.combined.clicks)}
          sub={`CTR ${pct(data.combined.ctr)}`}
          delta={deltas.clicks}
          deltaKey="clicks"
        />
        <MetricCard
          label="Conversions"
          value={num(data.combined.conversions)}
          sub={`CPA ${money(data.combined.cpa)}`}
          delta={deltas.conversions}
          deltaKey="conversions"
        />
        <MetricCard
          label="ROAS"
          value={ratio(data.combined.roas)}
          sub="Blended Meta + Google"
          delta={deltas.roas}
          deltaKey="roas"
        />
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>AI recommendations</h3>
          <InsightList insights={insights} />
        </div>
        <div className="card">
          <h3>Suggested next actions</h3>
          <ol className="action-list">
            {narrative.nextActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
          <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
            Generated {new Date().toLocaleString()} · source {data.source}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Campaign detail</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Spend</th>
              <th>Clicks</th>
              <th>Conv.</th>
              <th>CPA</th>
              <th>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={`${c.platform}-${c.id}`}>
                <td>
                  <div className="client-name">{c.name}</div>
                  {c.objective ? <div className="client-meta">{c.objective}</div> : null}
                </td>
                <td>
                  <span className="badge muted">{c.platform}</span>
                </td>
                <td>{c.status}</td>
                <td className="mono">{money(c.metrics.spend)}</td>
                <td className="mono">{num(c.metrics.clicks)}</td>
                <td className="mono">{num(c.metrics.conversions)}</td>
                <td className="mono">{money(c.metrics.cpa)}</td>
                <td className="mono">{ratio(c.metrics.roas)}</td>
              </tr>
            ))}
            {!data.campaigns.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  No campaigns yet for this client/range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
