import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientBrandHeader } from "@/components/ClientBrandHeader";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { money, num } from "@/lib/format";
import { getClientSemrushSeo } from "@/lib/semrush";

export const dynamic = "force-dynamic";

export default async function ClientSeoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = getClient(slug);
  if (!client) notFound();

  const seo = await getClientSemrushSeo(client, { keywordLimit: 25 });
  const ov = seo.overview;

  return (
    <div>
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href="/seo" className="back-link">
            ← All SEO
          </Link>
          <div style={{ marginTop: 10 }}>
            <ClientBrandHeader
              name={`${client.name} · SEO`}
              slug={client.slug}
              industry={client.industry}
              rangeLabel={seo.domain || "No domain"}
            />
          </div>
        </div>
        <div className="top-actions">
          <StatusBadge
            status={
              seo.source === "live"
                ? "live"
                : seo.source === "missing-domain" || seo.source === "missing-key"
                  ? "missing"
                  : "partial"
            }
          />
          <Link className="btn ghost" href={`/reports/${slug}/seo`}>
            Report view
          </Link>
          <Link className="btn primary" href={`/clients/${slug}`}>
            Ads dashboard
          </Link>
        </div>
      </div>

      <div className="report-channel-tabs">
        <Link href={`/reports/${slug}`} className="report-channel-tab">
          Blended ads
        </Link>
        <Link href={`/reports/${slug}/meta`} className="report-channel-tab">
          Meta
        </Link>
        <Link href={`/reports/${slug}/google`} className="report-channel-tab">
          Google
        </Link>
        <Link href={`/reports/${slug}/seo`} className="report-channel-tab active">
          SEO
        </Link>
      </div>

      {seo.notes.length ? (
        <div className="notice">
          {seo.notes.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      ) : (
        <div className="notice">
          <strong>Semrush organic snapshot</strong> for {seo.domain} · {seo.database.toUpperCase()}{" "}
          database. Traffic/cost are Semrush estimates.
        </div>
      )}

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Organic traffic" value={num(ov?.organicTraffic)} sub="Est. monthly visits" />
        <MetricCard label="Organic keywords" value={num(ov?.organicKeywords)} sub="Ranking terms" />
        <MetricCard label="Traffic value" value={money(ov?.organicCost)} sub="Est. organic cost" />
        <MetricCard label="Domain rank" value={num(ov?.rank)} sub={`${seo.database.toUpperCase()} rank`} />
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Paid search (Semrush)</h3>
          <div className="channel-stat-list">
            <div>
              <span>Ad keywords</span>
              <strong>{num(ov?.adwordsKeywords)}</strong>
            </div>
            <div>
              <span>Paid traffic</span>
              <strong>{num(ov?.adwordsTraffic)}</strong>
            </div>
            <div>
              <span>Paid cost est.</span>
              <strong>{money(ov?.adwordsCost)}</strong>
            </div>
            <div>
              <span>Domain</span>
              <strong style={{ fontSize: 13 }}>{seo.domain || "—"}</strong>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>How to use</h3>
          <ol className="action-list">
            <li>Compare organic traffic value vs Meta/Google spend on the ads report.</li>
            <li>Hunt page-1 keywords with weak CTR creatives for paid support.</li>
            <li>Watch position drops on money terms and pair with landing-page fixes.</li>
          </ol>
        </div>
      </div>

      {(() => {
        const movers = [...seo.organicKeywords]
          .filter((k) => k.positionDifference != null && k.positionDifference !== 0)
          .sort(
            (a, b) =>
              Math.abs(b.positionDifference || 0) -
              Math.abs(a.positionDifference || 0)
          )
          .slice(0, 8);
        if (!movers.length) return null;
        return (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head-row">
              <div>
                <h3>Keyword movers</h3>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Biggest position changes in this Semrush snapshot
                </p>
              </div>
              <span className="badge muted">{movers.length}</span>
            </div>
            <div className="seo-movers" style={{ marginTop: 12 }}>
              {movers.map((k) => {
                const d = k.positionDifference || 0;
                // Semrush Pd: positive often means improved rank (moved up).
                const up = d > 0;
                return (
                  <div key={`m-${k.keyword}-${k.url || ""}`} className="seo-mover-row">
                    <div>
                      <div className="client-name">{k.keyword}</div>
                      <div className="client-meta">
                        Pos {num(k.position)}
                        {k.previousPosition != null
                          ? ` · was ${num(k.previousPosition)}`
                          : ""}
                      </div>
                    </div>
                    <span className={`badge ${up ? "ok" : "danger"}`}>
                      {up ? `+${d}` : d}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="card">
        <div className="card-head-row">
          <div>
            <h3>Top organic keywords</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Sorted by Semrush traffic share
            </p>
          </div>
          <span className="badge muted">{seo.organicKeywords.length}</span>
        </div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Pos</th>
              <th>Δ</th>
              <th>Volume</th>
              <th>CPC</th>
              <th>Traffic %</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {seo.organicKeywords.map((k) => (
              <tr key={`${k.keyword}-${k.url || ""}`}>
                <td>
                  <div className="client-name">{k.keyword}</div>
                </td>
                <td className="mono">{num(k.position)}</td>
                <td className="mono">
                  {k.positionDifference == null
                    ? "—"
                    : k.positionDifference > 0
                      ? `+${k.positionDifference}`
                      : String(k.positionDifference)}
                </td>
                <td className="mono">{num(k.searchVolume)}</td>
                <td className="mono">{money(k.cpc)}</td>
                <td className="mono">
                  {k.trafficPercent == null ? "—" : `${k.trafficPercent.toFixed(2)}%`}
                </td>
                <td className="muted" style={{ maxWidth: 220 }}>
                  {k.url ? (
                    <a href={k.url} target="_blank" rel="noreferrer" className="ad-link" style={{ marginTop: 0 }}>
                      {k.url.replace(/^https?:\/\//, "").slice(0, 42)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!seo.organicKeywords.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No organic keywords returned.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        Fetched {new Date(seo.fetchedAt).toLocaleString()}
      </div>
    </div>
  );
}
