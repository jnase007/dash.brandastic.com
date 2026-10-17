import type { Metadata } from "next";
import { ProfitabilityDashboard } from "@/components/ProfitabilityDashboard";
import { getTempoProfitability } from "@/lib/tempo";

export const metadata: Metadata = {
  title: "Client Reports & Profitability · Brandastic Ads Dash",
};

export const dynamic = "force-dynamic";

export default async function ProfitabilityPage() {
  try {
    const data = await getTempoProfitability();
    return <ProfitabilityDashboard data={data} />;
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
