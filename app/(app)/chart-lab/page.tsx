import Link from "next/link";
import { ChartLab } from "@/components/ChartLab";

export const dynamic = "force-dynamic";

export default function ChartLabPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Temporary</p>
      <h1 className="mt-1 text-2xl font-bold">Chart lab</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600">
        uPlot only. Fake 60-day spend. Drag to zoom a date range, then Reset to go back to the full period.
        Analysis is unchanged until we swap it in.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/deep-analysis" className="text-blue-600 hover:underline">
          Back to Analysis
        </Link>
      </p>
      <ChartLab />
    </div>
  );
}
