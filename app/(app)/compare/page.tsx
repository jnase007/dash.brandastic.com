import Link from "next/link";
import { Suspense } from "react";
import { CompareControls } from "@/components/CompareControls";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getCompareBoard, type CompareChannel } from "@/lib/compare-data";
import {
  DEFAULT_COMPARE_CURRENT,
  compareWindowSet,
  resolveCompareCurrent,
} from "@/lib/compare-windows";
import { compactRangeLabel, formatDateTimePT } from "@/lib/format";
import {
  METRIC_COLUMNS,
  formatMetricCell,
  type MetricKey,
} from "@/lib/metric-columns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function deltaClass(key: MetricKey, direction: "up" | "down" | "flat" | "na") {
  if (direction === "na" || direction === "flat") return "muted";
  const invert = METRIC_COLUMNS.find((c) => c.key === key)?.invert;
  const good = invert ? direction === "down" : direction === "up";
  return good ? "ok" : "warn";
}

function formatDeltaPct(pct: number | null) {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(1)}%`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const range = resolveCompareCurrent(sp.range || DEFAULT_COMPARE_CURRENT);
  const channel = (
    ["combined", "meta", "google"].includes(sp.channel || "")
      ? sp.channel
      : "combined"
  ) as CompareChannel;
  const windows = compareWindowSet(range);
  const board = await getCompareBoard(range, channel);
  const current = board.portfolio.current;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Compare</h1>
          <p>
            {compactRangeLabel(windows.current.range)} vs{" "}
            {compactRangeLabel(windows.previousMonth.range)} vs{" "}
            {compactRangeLabel(windows.previousYear.range)} · review-only
          </p>
        </div>
        <div className="top-actions">
          <StatusBadge status={current ? "connected" : "partial"} />
        </div>
      </div>

      <div className="notice">
        Same metric columns on every client: spend, impressions, clicks, CTR,
        CPC, conversions, CPA, ROAS. Pulled live from Meta and Google. No
        warehouse.
      </div>

      <Suspense fallback={null}>
        <CompareControls range={range} channel={channel} />
      </Suspense>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        {METRIC_COLUMNS.map((col) => (
          <MetricCard
            key={col.key}
            label={col.label}
            value={formatMetricCell(current, col)}
            sub={`vs month ${formatDeltaPct(board.portfolioDeltas.previousMonth[col.key].pct)} · vs year ${formatDeltaPct(board.portfolioDeltas.previousYear[col.key].pct)}`}
            delta={board.portfolioDeltas.previousMonth[col.key]}
            deltaKey={col.key}
          />
        ))}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <h3>Client compare</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              {METRIC_COLUMNS.map((col) => (
                <th key={col.key}>{col.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.clients.map((row) => (
              <tr key={row.slug}>
                <td>
                  <Link href={`/clients/${row.slug}?range=${range}`}>{row.name}</Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {row.mapped.meta ? "Meta" : "No Meta"} ·{" "}
                    {row.mapped.google ? "Google" : "No Google"}
                  </div>
                </td>
                {METRIC_COLUMNS.map((col) => {
                  const month = row.deltas.previousMonth[col.key];
                  const year = row.deltas.previousYear[col.key];
                  return (
                    <td key={col.key} className="mono">
                      <div>{formatMetricCell(row.windows.current, col)}</div>
                      <div className={deltaClass(col.key, month.direction)} style={{ fontSize: 12 }}>
                        Mo {formatDeltaPct(month.pct)}
                      </div>
                      <div className={deltaClass(col.key, year.direction)} style={{ fontSize: 12 }}>
                        Yr {formatDeltaPct(year.pct)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 12 }}>
          Generated {formatDateTimePT(board.generatedAt)}. Windows:{" "}
          {board.windows.map((w) => `${w.short} ${w.label}`).join(" · ")}.
        </p>
      </div>

      {board.notes.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Coverage notes</h3>
          <ul className="muted" style={{ paddingLeft: 18 }}>
            {board.notes.slice(0, 12).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
