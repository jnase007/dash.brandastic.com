import Link from "next/link";
import { Suspense } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel, money, num, pct, ratio } from "@/lib/format";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range || "30d";
  const data = await getPortfolio(range);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Ads Overview</h1>
          <p>
            Meta + Google performance across Brandastic clients ·{" "}
            {compactRangeLabel(range)}
          </p>
        </div>
        <div className="top-actions">
          <StatusBadge status={data.mode} />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      <div className="home-hero">
        <div className="home-hero-card">
          <img src="/team/office-1.png" alt="Brandastic team" />
          <div className="home-hero-overlay">
            <strong>Brandastic team workspace</strong>
            <span>Left-nav updates · client-branded reviews · Meta + Google</span>
          </div>
        </div>
        <div className="home-hero-card">
          <img src="/team/justin-portrait.webp" alt="Justin Nase" />
          <div className="home-hero-overlay">
            <strong>Review-only access</strong>
            <span>No campaign edits from this dashboard</span>
          </div>
        </div>
      </div>

      <div className="notice">
        <strong>Review only.</strong> This dashboard reads Meta + Google metrics.
        No budgets, campaigns, ads, or audiences can be changed here.
        {data.mode !== "live" ? (
          <>
            {" "}
            Currently showing <strong>{data.mode}</strong> data
            {data.connection.meta === "missing" ||
            data.connection.google === "missing"
              ? " until API tokens + account IDs are fully wired."
              : "."}
          </>
        ) : null}
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Total spend" value={money(data.totals.spend)} sub={compactRangeLabel(range)} />
        <MetricCard label="Clicks" value={num(data.totals.clicks)} sub={`CTR ${pct(data.totals.ctr)}`} />
        <MetricCard
          label="Conversions"
          value={num(data.totals.conversions)}
          sub={`CPA ${money(data.totals.cpa)}`}
        />
        <MetricCard
          label="Blended ROAS"
          value={ratio(data.totals.roas)}
          sub={`Impr. ${num(data.totals.impressions)}`}
        />
      </div>

      <div className="grid two">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <h3>Clients</h3>
            <Link href="/clients" className="btn ghost">
              View all
            </Link>
          </div>
          {data.clients.map((c) => {
            const brand = clientBrand(c.client.slug);
            return (
              <Link key={c.client.id} href={`/clients/${c.client.slug}`} className="client-row">
                <div className="client-row-left">
                  <div
                    className="client-avatar"
                    style={{ background: brand.accent }}
                  >
                    {brand.monogram}
                  </div>
                  <div>
                    <div className="client-name">{c.client.name}</div>
                    <div className="client-meta">
                      {c.client.industry || "Client"} · {c.source}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontWeight: 800 }}>
                    {money(c.combined.spend)}
                  </div>
                  <div className="client-meta">
                    CPA {money(c.combined.cpa)} · ROAS {ratio(c.combined.roas)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <h3>Connections</h3>
            <div className="client-row">
              <div>
                <div className="client-name">Meta Marketing API</div>
                <div className="client-meta">Read-only insights + account list</div>
              </div>
              <StatusBadge status={data.connection.meta} />
            </div>
            <div className="client-row">
              <div>
                <div className="client-name">Google Ads API</div>
                <div className="client-meta">Read-only campaign metrics</div>
              </div>
              <StatusBadge status={data.connection.google} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Generated {new Date(data.generatedAt).toLocaleString()}
            </div>
          </div>

          <div className="card">
            <h3>What team + clients can review</h3>
            <div className="pill-row" style={{ marginBottom: 12 }}>
              <span className="badge blue">Spend</span>
              <span className="badge blue">Clicks / CTR</span>
              <span className="badge blue">Leads / Conv.</span>
              <span className="badge blue">CPA</span>
              <span className="badge blue">ROAS</span>
              <span className="badge muted">Campaign list</span>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Client pages are shareable inside the team PIN gate. Next pass can
              add per-client magic links if you want external client access
              without the full portfolio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
