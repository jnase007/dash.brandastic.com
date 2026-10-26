import type { Metadata } from "next";
import { TeamDashboard } from "@/components/TeamDashboard";
import { teamRange } from "@/lib/team";
import { getTeamPerformanceData } from "@/lib/tempo";

export const metadata: Metadata = {
  title: "Team Performance · Brandastic Ads Dash",
};

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  try {
    const data = await getTeamPerformanceData();
    return <TeamDashboard data={data} view="overview" range={teamRange(range)} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tempo could not be loaded.";
    return (
      <div className="pr-page">
        <div className="pr-panel">
          <h1>Team Performance</h1>
          <p className="pr-note">{message}</p>
        </div>
      </div>
    );
  }
}
