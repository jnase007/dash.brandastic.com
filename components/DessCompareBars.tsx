"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { roas, type PeriodMetrics } from "@/lib/dess-weekly-review";
import styles from "./DessWeeklyReviewBoard.module.css";

function ctr(m: PeriodMetrics) {
  if (!m.impressions) return 0;
  return m.clicks / m.impressions;
}
function convRate(m: PeriodMetrics) {
  if (!m.clicks) return 0;
  return (m.conversions || 0) / m.clicks;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-US");

function fmt(label: string, n: number) {
  if (label === "CTR" || label === "CR") return `${(n * 100).toFixed(2)}%`;
  if (label === "ROAS") return `${n.toFixed(1)}x`;
  if (label === "CPC") return money2.format(n);
  if (label === "Clicks" || label === "Conv.") return int.format(n);
  return money.format(n);
}

export function DessCompareBars({
  now,
  prior,
  nowLabel,
  priorLabel,
}: {
  now: PeriodMetrics;
  prior: PeriodMetrics;
  nowLabel: string;
  priorLabel: string;
}) {
  const raw = [
    { label: "Cost", a: now.cost, b: prior.cost },
    { label: "Clicks", a: now.clicks, b: prior.clicks },
    { label: "CTR", a: ctr(now), b: ctr(prior) },
    { label: "CPC", a: now.cpc, b: prior.cpc },
    { label: "Conv.", a: now.conversions || 0, b: prior.conversions || 0 },
    { label: "Value", a: now.convValue, b: prior.convValue },
    { label: "CR", a: convRate(now), b: convRate(prior) },
    { label: "ROAS", a: roas(now.cost, now.convValue) || 0, b: roas(prior.cost, prior.convValue) || 0 },
  ];
  const data = raw.map((p) => {
    const max = Math.max(p.a, p.b, 0.0001);
    return { ...p, current: (p.a / max) * 100, compare: (p.b / max) * 100 };
  });

  return (
    <div className={styles.chartWrap}>
      <div className={styles.rechart}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barGap={4} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#eef1f7" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              cursor={{ fill: "rgba(15,23,42,0.04)" }}
              formatter={(value, key, item) => {
                const row = item.payload as (typeof data)[number];
                const real = key === "current" ? row.a : row.b;
                return [fmt(row.label, real), key === "current" ? nowLabel : priorLabel];
              }}
            />
            <Bar dataKey="current" fill="#0369a1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="compare" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.chartLegend}>
        <span className={styles.legNow}>{nowLabel}</span>
        <span className={styles.legPrior}>{priorLabel}</span>
      </div>
    </div>
  );
}
