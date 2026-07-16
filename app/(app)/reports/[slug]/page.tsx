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
import { compactRangeLabel, money, num, pct, ratio } from "@/lib/format";
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
  const range = sp.range || "30d";
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

      <div className="notice">
        <strong>Custom client report.</strong> Use this as the AgencyAnalytics-style
        review page for {data.client.name}. AI recommendations below are generated
        from the same metrics — review only; apply changes in the ad platforms.
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
