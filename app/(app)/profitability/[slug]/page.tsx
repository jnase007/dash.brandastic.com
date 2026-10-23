import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfitabilityDashboard } from "@/components/ProfitabilityDashboard";
import { clientBySlug, profitRange } from "@/lib/profitability";
import { getTempoProfitabilityForSlug } from "@/lib/tempo";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const label = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return { title: `${label || "Client"} · Client Reports & Profitability · Brandastic Ads Dash` };
}

export default async function ProfitabilityClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const { range } = await searchParams;
  let data;
  try {
    data = await getTempoProfitabilityForSlug(slug);
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
  if (!clientBySlug(data.clients, slug)) notFound();
  return <ProfitabilityDashboard data={data} view="client" slug={slug} range={profitRange(range)} />;
}
