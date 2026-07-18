import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { money, num } from "@/lib/format";
import { getPortfolioSemrushSeo, semrushConfigured } from "@/lib/semrush";

export const dynamic = "force-dynamic";

export default async function SeoPortfolioPage() {
  const data = await getPortfolioSemrushSeo({ keywordLimit: 5 });
  const liveCount = data.clients.filter((c) => c.source === "live").length;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>SEO · Semrush</h1>
          <p>
            Organic visibility by client domain · database {data.database.toUpperCase()} ·{" "}
            {liveCount}/{data.clients.length} live
          </p>
        </div>
        <div className="top-actions">
          <StatusBadge status={semrushConfigured() ? "live" : "missing"} />
        </div>
      </div>

      <div className="notice">
        <strong>Semrush SEO channel.</strong> Domain rank, organic traffic estimates, and top
        keywords pulled read-only from Semrush. Paid ads stay on Meta/Google reports — this is
        the organic channel view.
      </div>

      {!semrushConfigured() ? (
        <div className="notice" style={{ borderColor: "rgba(220,38,38,0.25)" }}>
          <strong>SEMRUSH_API_KEY missing.</strong> Add it in Vercel env to unlock live SEO data.
        </div>
      ) : null}

      <div className="grid two">
        {data.clients.map((c) => {
          const brand = clientBrand(c.clientSlug);
          const ov = c.overview;
          return (
            <div key={c.clientSlug} className="card report-card">
              <div className="client-row-left" style={{ marginBottom: 12 }}>
                <div className="client-avatar" style={{ background: brand.accent }}>
                  {brand.monogram}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="client-name">{c.clientName}</div>
                  <div className="client-meta">
                    {c.domain || "No domain"} · {c.source}
                  </div>
                </div>
                <StatusBadge
                  status={
                    c.source === "live"
                      ? "live"
                      : c.source === "missing-domain" || c.source === "missing-key"
                        ? "missing"
                        : "partial"
                  }
                />
              </div>

              <div className="grid metrics" style={{ gap: 10 }}>
                <div>
                  <div className="metric-label">Org. traffic</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {num(ov?.organicTraffic)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">Keywords</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {num(ov?.organicKeywords)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">Traffic value</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {money(ov?.organicCost)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">Rank</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {num(ov?.rank)}
                  </div>
                </div>
              </div>

              {c.organicKeywords.length ? (
                <div className="seo-kw-mini">
                  {c.organicKeywords.slice(0, 3).map((k) => (
                    <div key={`${c.clientSlug}-${k.keyword}`} className="seo-kw-mini-row">
                      <span>{k.keyword}</span>
                      <strong>#{k.position ?? "—"}</strong>
                    </div>
                  ))}
                </div>
              ) : c.notes.length ? (
                <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                  {c.notes[0]}
                </p>
              ) : null}

              <div className="report-channel-actions">
                <Link className="btn primary small" href={`/seo/${c.clientSlug}`}>
                  Open SEO report
                </Link>
                <Link
                  className="btn ghost small"
                  href={`/reports/${c.clientSlug}/seo`}
                >
                  In reports
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ marginTop: 14, fontSize: 12 }}>
        Fetched {new Date(data.fetchedAt).toLocaleString()} · Semrush estimates, not GA sessions
      </div>
    </div>
  );
}
