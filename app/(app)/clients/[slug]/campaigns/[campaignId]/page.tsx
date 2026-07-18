import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { getClient } from "@/lib/clients";
import { getCampaignDetail } from "@/lib/data";
import { compactRangeLabel, money, normalizeRange, num, pct, ratio } from "@/lib/format";
import { getClientLogoUrl } from "@/lib/logos";

function formatCta(cta?: string) {
  if (!cta) return "Learn more";
  return cta
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayDomain(url?: string) {
  if (!url) return "WEBSITE";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.toUpperCase();
  } catch {
    return "WEBSITE";
  }
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; campaignId: string }>;
  searchParams: Promise<{ range?: string; platform?: string }>;
}) {
  const { slug, campaignId } = await params;
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const platform = sp.platform === "google" ? "google" : "meta";
  const base = getClient(slug);
  if (!base) notFound();
  const brand = clientBrand(slug);
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
            <h3>Ad previews</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              AgencyAnalytics-style Facebook previews with live creative + metrics.
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
              // Prefer a real video asset first so we don't mis-detect carousel
              // from multiple fallback thumbs of the same video ad.
              const videoHero =
                ad.assets.find((a) => a.videoUrl) ||
                ad.assets.find((a) => a.type === "video");
              const imageAssets = ad.assets.filter(
                (a) =>
                  a.type !== "video" &&
                  !a.videoUrl &&
                  Boolean(a.url || a.thumbnailUrl)
              );
              const hero =
                videoHero ||
                ad.assets.find((a) => a.url || a.thumbnailUrl) ||
                imageAssets[0];
              const poster =
                videoHero?.thumbnailUrl ||
                videoHero?.url ||
                hero?.thumbnailUrl ||
                hero?.url;
              const videoSrc = videoHero?.videoUrl;
              const imageSrc =
                hero?.type === "video"
                  ? poster
                  : hero?.url || hero?.thumbnailUrl;
              const ctaLabel = formatCta(ad.cta);
              const domain = displayDomain(ad.linkUrl);
              const pageLabel = ad.pageName || data.clientName;
              const avatarUrl = ad.pagePictureUrl || logoUrl;
              const carouselAssets = imageAssets
                .map((asset) => asset.url || asset.thumbnailUrl)
                .filter(Boolean) as string[];
              const isCarousel =
                !videoSrc &&
                (hero?.type === "carousel" || carouselAssets.length > 1);

              return (
                <article key={ad.id} className="ad-preview-card">
                  <div className="ad-preview-head">
                    <div>
                      <div className="ad-preview-kicker">Ad preview</div>
                      <strong className="fb-ad-internal-name">{ad.name}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {ad.status}
                        {ad.cta ? ` · ${ctaLabel}` : ""}
                        {videoHero || hero?.type === "video" ? " · Video" : ""}
                      </div>
                    </div>
                    <div className="ad-metric-chip">
                      <span>Spend</span>
                      <strong>{money(ad.metrics.spend)}</strong>
                    </div>
                  </div>

                  <div className="fb-ad aa-style">
                    <header className="fb-ad-header">
                      <div
                        className="fb-ad-avatar"
                        style={{
                          background: avatarUrl ? "#fff" : brand.accent,
                          borderColor: brand.accentSoft,
                        }}
                      >
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="" />
                        ) : (
                          <span>{brand.monogram}</span>
                        )}
                      </div>
                      <div className="fb-ad-page">
                        <div className="fb-ad-page-name">
                          {pageLabel}
                          <span className="fb-ad-verified" aria-hidden>
                            ✓
                          </span>
                        </div>
                        <div className="fb-ad-sponsored">Sponsored</div>
                      </div>
                      <div className="fb-ad-more" aria-hidden>
                        ···
                      </div>
                    </header>

                    {ad.primaryText ? (
                      <p className="fb-ad-primary">{ad.primaryText}</p>
                    ) : null}

                    {isCarousel && carouselAssets.length > 1 ? (
                      <div className="fb-ad-carousel">
                        {carouselAssets.slice(0, 4).map((src, idx) => (
                          <div key={`${ad.id}-c-${idx}`} className="fb-ad-carousel-item">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="fb-ad-media landscape">
                        {videoSrc ? (
                          <video
                            className="fb-ad-video"
                            src={videoSrc}
                            poster={poster || undefined}
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageSrc} alt={ad.headline || ad.name} />
                        ) : poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={poster} alt={ad.headline || ad.name} />
                        ) : (
                          <div className="ad-creative-empty">No creative preview</div>
                        )}
                        {!videoSrc && (videoHero || hero?.type === "video") ? (
                          <span className="fb-ad-play" aria-hidden>
                            ▶
                          </span>
                        ) : null}
                      </div>
                    )}

                    <div className="fb-ad-linkbox stacked">
                      <div className="fb-ad-linkbox-copy">
                        <div className="fb-ad-domain">{domain}</div>
                        <div className="fb-ad-headline">
                          {ad.headline || ad.name}
                        </div>
                        {ad.description ? (
                          <div className="fb-ad-desc">{ad.description}</div>
                        ) : null}
                      </div>
                      {ad.linkUrl ? (
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="fb-ad-cta primary"
                        >
                          {ctaLabel}
                        </a>
                      ) : (
                        <span className="fb-ad-cta primary muted-cta">{ctaLabel}</span>
                      )}
                    </div>
                  </div>

                  <div className="ad-metrics-row">
                    <div>
                      <span>Clicks</span>
                      <strong>{num(ad.metrics.clicks)}</strong>
                    </div>
                    <div>
                      <span>Impr.</span>
                      <strong>{num(ad.metrics.impressions)}</strong>
                    </div>
                    <div>
                      <span>CTR</span>
                      <strong>{pct(ad.metrics.ctr)}</strong>
                    </div>
                    <div>
                      <span>Conv.</span>
                      <strong>{num(ad.metrics.conversions)}</strong>
                    </div>
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
