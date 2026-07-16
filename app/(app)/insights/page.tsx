import Link from "next/link";
import { Suspense } from "react";
import { InsightList } from "@/components/InsightList";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel } from "@/lib/format";
import { buildPortfolioInsights } from "@/lib/insights";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range || "30d";
  const data = await getPortfolio(range);
  const insights = buildPortfolioInsights(data).slice(0, 24);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>AI Recommendations</h1>
          <p>
            Data-driven flags and next actions across Meta + Google ·{" "}
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
        <strong>AgencyAnalytics replacement path.</strong> These recommendations
        are generated from live/demo metrics already in Dash (CPA, ROAS, CTR,
        zero-conversion spend, channel gaps). Review-only — humans apply changes
        in Ads Manager / Google Ads. Custom client reports live under{" "}
        <Link href="/reports">Reports</Link>.
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3>Priority insights</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {insights.length} recommendations
          </span>
        </div>
        <InsightList insights={insights} />
      </div>
    </div>
  );
}
