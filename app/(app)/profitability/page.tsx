import type { Metadata } from "next";
import { ProfitabilityDashboard } from "@/components/ProfitabilityDashboard";
import { profitRange } from "@/lib/profitability";
import { getTempoProfitability } from "@/lib/tempo";

export const metadata: Metadata = {
  title: "Client Reports & Profitability · Brandastic Ads Dash",
};

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  try {
    const data = await getTempoProfitability();
    return <ProfitabilityDashboard data={data} view="overview" range={profitRange(range)} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tempo could not be loaded.";
    return (
      <div className="pr-page">
        <div className="pr-panel">
          <h1>Client Reports & Profitability</h1>
          <p className="pr-note">{message}</p>
        </div>
      </div>
    );
  }
}
