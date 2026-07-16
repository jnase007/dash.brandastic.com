import type { Delta } from "@/lib/compare";
import { isHealthyDelta } from "@/lib/compare";

function formatDelta(d?: Delta | null, asMoney = false) {
  if (!d || d.direction === "na" || d.pct == null) return null;
  const arrow = d.direction === "up" ? "↑" : d.direction === "down" ? "↓" : "→";
  const pct = `${Math.abs(d.pct * 100).toFixed(1)}%`;
  return `${arrow} ${pct}`;
}

export function MetricCard({
  label,
  value,
  sub,
  delta,
  deltaKey = "spend",
  spark = [28, 34, 30, 42, 38, 48, 52],
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: Delta | null;
  deltaKey?: "spend" | "clicks" | "conversions" | "cpa" | "roas" | "ctr";
  spark?: number[];
}) {
  const deltaLabel = formatDelta(delta);
  const healthy = delta ? isHealthyDelta(deltaKey, delta.direction) : null;
  const max = Math.max(...spark, 1);
  const points = spark
    .map((v, i) => {
      const x = (i / Math.max(spark.length - 1, 1)) * 100;
      const y = 28 - (v / max) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="card metric-card premium">
      <div className="metric-card-top">
        <div className="metric-label">{label}</div>
        {deltaLabel ? (
          <span
            className={`delta-pill ${
              healthy === true ? "good" : healthy === false ? "bad" : "flat"
            }`}
          >
            {deltaLabel}
          </span>
        ) : null}
      </div>
      <div className="metric-value mono">{value}</div>
      {sub ? <div className="metric-sub">{sub}</div> : null}
      <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
}
