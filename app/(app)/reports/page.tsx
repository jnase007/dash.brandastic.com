import Link from "next/link";
import { Suspense } from "react";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel, money, normalizeRange, num, ratio } from "@/lib/format";
import { buildClientInsights } from "@/lib/insights";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getPortfolio(range);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Client Reports</h1>
          <p>
            Custom branded performance reports for team reviews + client shares ·{" "}
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

      <div className="notice">
        <strong>Built to replace AgencyAnalytics for Brandastic.</strong> Each
        report includes spend, conversions, CPA/ROAS, campaign table, and AI
        recommendations. Share client links inside the team PIN gate for now;
        external magic links can come next.
      </div>

      <div className="grid two">
        {data.clients.map((c) => {
          const brand = clientBrand(c.client.slug);
          const recs = buildClientInsights(c).length;
          return (
            <Link
              key={c.client.id}
              href={`/reports/${c.client.slug}?range=${range}`}
              className="card report-card"
            >
              <div className="client-row-left" style={{ marginBottom: 14 }}>
                <div className="client-avatar" style={{ background: brand.accent }}>
                  {brand.monogram}
                </div>
                <div>
                  <div className="client-name">{c.client.name}</div>
                  <div className="client-meta">
                    {c.client.industry || "Client"} · {recs} recommendations
                  </div>
                </div>
              </div>
              <div className="grid metrics" style={{ gap: 10 }}>
                <div>
                  <div className="metric-label">Spend</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {money(c.combined.spend)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">Conv.</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {num(c.combined.conversions)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">CPA</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {money(c.combined.cpa)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">ROAS</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {ratio(c.combined.roas)}
                  </div>
                </div>
              </div>
              <div className="report-card-cta">Open custom report →</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
