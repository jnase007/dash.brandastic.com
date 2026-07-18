import Link from "next/link";
import { clientBrand } from "@/lib/brand";
import { money, num, pct } from "@/lib/format";
import type { AdCreativeRow } from "@/lib/types";

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
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return "WEBSITE";
  }
}

export function AdPreviewCard({
  ad,
  clientSlug,
  clientName,
  logoUrl,
  selected = false,
  compact = false,
  selectHref,
}: {
  ad: AdCreativeRow;
  clientSlug: string;
  clientName: string;
  logoUrl?: string | null;
  selected?: boolean;
  compact?: boolean;
  selectHref?: string;
}) {
  const brand = clientBrand(clientSlug);
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
    hero?.type === "video" ? poster : hero?.url || hero?.thumbnailUrl;
  const ctaLabel = formatCta(ad.cta);
  const domain = displayDomain(ad.linkUrl);
  const pageLabel = ad.pageName || clientName;
  const avatarUrl = ad.pagePictureUrl || logoUrl || undefined;
  const carouselAssets = imageAssets
    .map((asset) => asset.url || asset.thumbnailUrl)
    .filter(Boolean) as string[];
  const isCarousel =
    !videoSrc && (hero?.type === "carousel" || carouselAssets.length > 1);

  const body = (
    <article
      className={`ad-preview-card ${selected ? "selected" : ""} ${
        compact ? "compact" : ""
      }`}
    >
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

        {ad.primaryText ? <p className="fb-ad-primary">{ad.primaryText}</p> : null}

        {isCarousel && carouselAssets.length > 1 ? (
          <div className="fb-ad-carousel">
            {carouselAssets.slice(0, 4).map((src, idx) => (
              <div key={`${ad.id}-c-${idx}`} className="fb-ad-carousel-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        ) : videoSrc || imageSrc || poster ? (
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
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster!} alt={ad.headline || ad.name} />
            )}
            {!videoSrc && (videoHero || hero?.type === "video") ? (
              <span className="fb-ad-play" aria-hidden>
                ▶
              </span>
            ) : null}
          </div>
        ) : (
          <div className="rsa-preview">
            <div className="rsa-preview-kicker">Search ad preview</div>
            <div className="rsa-preview-url">
              {ad.linkUrl || domain.toLowerCase()}
            </div>
            <div className="rsa-preview-headline">
              {ad.headline || ad.name}
            </div>
            {ad.description || ad.primaryText ? (
              <div className="rsa-preview-desc">
                {ad.description || ad.primaryText}
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>
                No RSA copy fields returned for this ad.
              </div>
            )}
          </div>
        )}

        <div className="fb-ad-linkbox stacked">
          <div className="fb-ad-linkbox-copy">
            <div className="fb-ad-domain">{domain}</div>
            <div className="fb-ad-headline">{ad.headline || ad.name}</div>
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

  if (selectHref) {
    return (
      <Link
        href={selectHref}
        className={`ad-select-link ${selected ? "selected" : ""}`}
        scroll={false}
      >
        {body}
      </Link>
    );
  }
  return body;
}
