import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { getCampaignDetail } from "@/lib/data";
import { compactRangeLabel, money, num, pct, ratio } from "@/lib/format";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; campaignId: string }>;
  searchParams: Promise<{ range?: string; platform?: string }>;
}) {
  const { slug, campaignId } = await params;
  const sp = await searchParams;
  const range = sp.range || "30d";
  const platform = sp.platform === "google" ? "google" : "meta";
  const base = getClient(slug);
  if (!base) notFound();

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
            Ads + creative previews · {compactRangeLabel(range)} · review only
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

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head-row">
          <div>
            <h3>Ads in this campaign</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Creative thumbnails, copy, and per-ad metrics for every click path.
            </p>
          </div>
          <span className="badge muted">{data.ads.length} ads</span>
        </div>

        {!data.ads.length ? (
          <p className="muted" style={{ marginTop: 12 }}>
            No ads found for this campaign in the selected range.
          </p>
        ) : (
          <div className="ad-creative-grid">
            {data.ads.map((ad) => {
              const hero = ad.assets.find((a) => a.url || a.thumbnailUrl);
              const preview = hero?.url || hero?.thumbnailUrl;
              return (
                <article key={ad.id} className="ad-creative-card">
                  <div className="ad-creative-media">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={ad.name} />
                    ) : (
                      <div className="ad-creative-empty">No preview</div>
                    )}
                    {hero?.type === "video" ? (
                      <span className="ad-media-tag">Video</span>
                    ) : null}
                    {hero?.type === "carousel" ? (
                      <span className="ad-media-tag">Carousel</span>
                    ) : null}
                  </div>
                  <div className="ad-creative-body">
                    <div className="ad-creative-top">
                      <div>
                        <strong>{ad.name}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {ad.status}
                          {ad.cta ? ` · ${ad.cta}` : ""}
                        </div>
                      </div>
                      <div className="ad-metric-chip">
                        <span>Spend</span>
                        <strong>{money(ad.metrics.spend)}</strong>
                      </div>
                    </div>

                    {ad.headline ? <div className="ad-headline">{ad.headline}</div> : null}
                    {ad.primaryText ? (
                      <p className="ad-primary-text">{ad.primaryText}</p>
                    ) : null}
                    {ad.description ? (
                      <p className="muted ad-desc">{ad.description}</p>
                    ) : null}

                    {ad.assets.length > 1 ? (
                      <div className="ad-asset-strip">
                        {ad.assets.slice(0, 6).map((asset, idx) => {
                          const src = asset.url || asset.thumbnailUrl;
                          if (!src) return null;
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${ad.id}-${idx}`}
                              src={src}
                              alt={asset.name || `${ad.name} asset ${idx + 1}`}
                            />
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="ad-metrics-row">
                      <div>
                        <span>Clicks</span>
                        <strong>{num(ad.metrics.clicks)}</strong>
                      </div>
                      <div>
                        <span>CTR</span>
                        <strong>{pct(ad.metrics.ctr)}</strong>
                      </div>
                      <div>
                        <span>Conv.</span>
                        <strong>{num(ad.metrics.conversions)}</strong>
                      </div>
                      <div>
                        <span>CPA</span>
                        <strong>{money(ad.metrics.cpa)}</strong>
                      </div>
                    </div>

                    {ad.linkUrl ? (
                      <a
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ad-link"
                      >
                        Open landing page →
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
