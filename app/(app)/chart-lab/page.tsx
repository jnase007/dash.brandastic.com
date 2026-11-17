import { Suspense } from "react";
import Link from "next/link";
import { ChartLab } from "@/components/ChartLab";
import { RangeSelect } from "@/components/RangeSelect";
import { normalizeRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChartLabPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range || "30d");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Temporary</p>
      <h1 className="mt-1 text-2xl font-bold">Chart lab</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600">
        uPlot only. Dates come from the period control (same as Analysis). The chart does not select dates.
        Hover a point for spend. Analysis is unchanged until we swap this in.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link href="/deep-analysis" className="text-sm text-blue-600 hover:underline">
          Back to Analysis
        </Link>
        <Suspense fallback={null}>
          <RangeSelect value={range} />
        </Suspense>
      </div>
      <ChartLab range={range} />
    </div>
  );
}
