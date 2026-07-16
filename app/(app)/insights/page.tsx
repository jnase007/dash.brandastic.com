import Link from "next/link";
import { Suspense } from "react";
import { InsightList } from "@/components/InsightList";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel, normalizeRange } from "@/lib/format";
import { getPortfolioInsights } from "@/lib/insights";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getPortfolio(range);
  const ai = await getPortfolioInsights(data, { limit: 24 });
  const insights = ai.insights;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>AI Recommendations</h1>
          <p>
            {ai.engine === "xai"
              ? `xAI Grok insights across Meta + Google · ${compactRangeLabel(range)}`
              : `Rule-based insights across Meta + Google · ${compactRangeLabel(range)}`}
          </p>
        </div>
        <div className="top-actions">
          <StatusBadge status={data.mode} />
          <span className={`badge ${ai.engine === "xai" ? "blue" : "muted"}`}>
            {ai.engine === "xai" ? `xAI · ${ai.model || "grok"}` : "rules"}
          </span>
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      <div className="notice">
        <strong>
          {ai.engine === "xai"
            ? "Powered by xAI API."
            : "Rule engine fallback."}
        </strong>{" "}
        {ai.note ||
          "Recommendations are generated from live/demo metrics already in Dash."}{" "}
        Review-only — humans apply changes in Ads Manager / Google Ads. Custom
        client reports live under <Link href="/reports">Reports</Link>.
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
