import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientBrandHeader } from "@/components/ClientBrandHeader";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { getClientSummary } from "@/lib/data";
import { compactRangeLabel, money, normalizeRange, num, pct, ratio } from "@/lib/format";
import { getClientLogoUrl } from "@/lib/logos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const base = getClient(slug);
  if (!base) notFound();

  const data = await getClientSummary(slug, range);
  const logoUrl = await getClientLogoUrl(slug);

  return (
    <div>
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <ClientBrandHeader
            name={data.client.name}
            slug={data.client.slug}
            industry={data.client.industry}
            rangeLabel={compactRangeLabel(range)}
            logoUrl={logoUrl}
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
        <div className="card-head-row">
          <div>
            <h3>Campaigns</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Click a Meta campaign to open ads + creative previews.
            </p>
          </div>
        </div>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => {
              const href =
                c.platform === "meta"
                  ? `/clients/${data.client.slug}/campaigns/${encodeURIComponent(c.id)}?range=${encodeURIComponent(range)}&platform=meta`
                  : null;
              return (
                <tr key={`${c.platform}-${c.id}`} className={href ? "row-clickable" : undefined}>
                  <td>
                    {href ? (
                      <Link href={href} className="campaign-link">
                        <div className="client-name">{c.name}</div>
                        {c.objective ? <div className="client-meta">{c.objective}</div> : null}
                      </Link>
                    ) : (
                      <>
                        <div className="client-name">{c.name}</div>
                        {c.objective ? <div className="client-meta">{c.objective}</div> : null}
                      </>
                    )}
                  </td>
                  <td>
                    <span className="badge muted">{c.platform}</span>
                  </td>
                  <td>{c.status}</td>
                  <td className="mono">{money(c.metrics.spend)}</td>
                  <td className="mono">{num(c.metrics.clicks)}</td>
                  <td className="mono">{num(c.metrics.conversions)}</td>
                  <td className="mono">{money(c.metrics.cpa)}</td>
                  <td>
                    {href ? (
                      <Link href={href} className="btn primary small">
                        Open ads
                      </Link>
                    ) : (
                      <span className="muted">Google soon</span>
                    )}
                  </td>
                </tr>
              );
            })}
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
