import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamDashboard } from "@/components/TeamDashboard";
import { memberSlug, teamRange } from "@/lib/team";
import { getTeamPerformanceData } from "@/lib/tempo";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ member: string }>;
}): Promise<Metadata> {
  const { member } = await params;
  const label = member
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return { title: `${label || "Team member"} · Team Performance · Brandastic Ads Dash` };
}

export default async function TeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ member: string }>;
  searchParams: Promise<{ range?: string; client?: string }>;
}) {
  const { member } = await params;
  const { range, client } = await searchParams;
  let data;
  try {
    data = await getTeamPerformanceData();
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
  const names = new Set([...(data.roster || []), ...data.entries.map((entry) => entry.member)]);
  if (![...names].some((name) => memberSlug(name) === member)) notFound();
  return <TeamDashboard data={data} view="person" member={member} range={teamRange(range)} client={client} />;
}
