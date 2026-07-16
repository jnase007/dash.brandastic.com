import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientBrandHeader } from "@/components/ClientBrandHeader";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { getClientSummary } from "@/lib/data";
import { compactRangeLabel, money, num, pct, ratio } from "@/lib/format";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const range = sp.range || "30d";
  const base = getClient(slug);
  if (!base) notFound();

  const data = await getClientSummary(slug, range);

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
        </div>
      </div>

      {data.notes?.length ? (
        <div className="notice">
          {data.notes.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      ) : null}

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Spend" value={money(data.combined.spend)} />
        <MetricCard label="Clicks" value={num(data.combined.clicks)} sub={`CTR ${pct(data.combined.ctr)}`} />
        <MetricCard
          label="Conversions"
          value={num(data.combined.conversions)}
          sub={`CPA ${money(data.combined.cpa)}`}
        />
        <MetricCard label="ROAS" value={ratio(data.combined.roas)} />
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Meta</h3>
          {data.meta ? (
            <div className="grid metrics">
              <div>
                <div className="metric-label">Spend</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {money(data.meta.spend)}
                </div>
              </div>
              <div>
                <div className="metric-label">Conv.</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {num(data.meta.conversions)}
                </div>
              </div>
              <div>
                <div className="metric-label">CPA</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {money(data.meta.cpa)}
                </div>
              </div>
              <div>
                <div className="metric-label">ROAS</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {ratio(data.meta.roas)}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">No Meta metrics for this range / mapping.</p>
          )}
        </div>
        <div className="card">
          <h3>Google Ads</h3>
          {data.google ? (
            <div className="grid metrics">
              <div>
                <div className="metric-label">Spend</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {money(data.google.spend)}
                </div>
              </div>
              <div>
                <div className="metric-label">Conv.</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {num(data.google.conversions)}
                </div>
              </div>
              <div>
                <div className="metric-label">CPA</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {money(data.google.cpa)}
                </div>
              </div>
              <div>
                <div className="metric-label">ROAS</div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {ratio(data.google.roas)}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">No Google metrics for this range / mapping.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Campaigns</h3>
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
              </tr>
            ))}
            {!data.campaigns.length ? (
              <tr>
                <td colSpan={7} className="muted">
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
