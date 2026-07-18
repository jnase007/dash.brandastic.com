import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdReviewFilters } from "@/components/AdReviewFilters";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { getCampaignDetail } from "@/lib/data";
import {
  compactRangeLabel,
  money,
  normalizeRange,
  num,
  pct,
  ratio,
} from "@/lib/format";
import { getClientLogoUrl } from "@/lib/logos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; campaignId: string }>;
  searchParams: Promise<{ range?: string; platform?: string; ad?: string }>;
}) {
  const { slug, campaignId } = await params;
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const platform = sp.platform === "google" ? "google" : "meta";
  const base = getClient(slug);
  if (!base) notFound();
  const logoUrl = await getClientLogoUrl(slug);

  let data;
  try {
    data = await getCampaignDetail(slug, campaignId, range, platform);
  } catch (e: any) {
    return (
      <div>
        <div className="topbar">
          <div>
            <Link href={`/clients/${slug}?range=${range}`} className="back-link">
              ← Back to {base.name}
            </Link>
            <h1 style={{ marginTop: 8 }}>Campaign unavailable</h1>
            <p className="muted">{e?.message || "Could not load campaign."}</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedAds = [...data.ads].sort(
    (a, b) => (b.metrics.spend || 0) - (a.metrics.spend || 0)
  );
  const selectedId =
    sp.ad && sortedAds.some((a) => a.id === sp.ad)
      ? sp.ad
      : sortedAds[0]?.id || "";

  const baseQs = `range=${encodeURIComponent(range)}&platform=${platform}`;

  return (
    <div>
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/clients/${data.clientSlug}?range=${encodeURIComponent(range)}`}
            className="back-link"
          >
            ← Back to {data.clientName}
          </Link>
          <div className="pill-row" style={{ marginTop: 10, marginBottom: 8 }}>
            <span className="badge blue">{data.campaign.platform}</span>
            <span className="badge muted">{data.campaign.status}</span>
            {data.campaign.objective ? (
              <span className="badge muted">{data.campaign.objective}</span>
            ) : null}
          </div>
          <h1 style={{ margin: 0 }}>{data.campaign.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            AA-style ad review · {compactRangeLabel(range)} · review only
          </p>
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
        <MetricCard label="Spend" value={money(data.campaign.metrics.spend)} />
        <MetricCard
          label="Clicks"
          value={num(data.campaign.metrics.clicks)}
          sub={`CTR ${pct(data.campaign.metrics.ctr)}`}
        />
        <MetricCard
          label="Conversions"
          value={num(data.campaign.metrics.conversions)}
          sub={`CPA ${money(data.campaign.metrics.cpa)}`}
        />
        <MetricCard label="ROAS" value={ratio(data.campaign.metrics.roas)} />
      </div>

      {!sortedAds.length ? (
        <div className="card">
          <p className="muted">
            No ads found for this campaign in the selected range.
            {platform === "google"
              ? " RSA/search ads and search terms still load below when available."
              : ""}
          </p>
        </div>
      ) : (
        <AdReviewFilters
          ads={sortedAds}
          selectedId={selectedId}
          baseQs={baseQs}
          clientSlug={data.clientSlug}
          clientName={data.clientName}
          logoUrl={logoUrl}
        />
      )}

      {data.searchTerms?.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head-row">
            <div>
              <h3>Search terms</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Top spend terms · review only
              </p>
            </div>
            <span className="badge muted">{data.searchTerms.length}</span>
          </div>
          <div style={{ overflow: "auto", marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Spend</th>
                  <th>Clicks</th>
                  <th>Impr.</th>
                  <th>Conv.</th>
                </tr>
              </thead>
              <tbody>
                {data.searchTerms.map((t) => (
                  <tr key={t.term}>
                    <td>{t.term}</td>
                    <td className="mono">{money(t.spend)}</td>
                    <td className="mono">{num(t.clicks)}</td>
                    <td className="mono">{num(t.impressions)}</td>
                    <td className="mono">{num(t.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
