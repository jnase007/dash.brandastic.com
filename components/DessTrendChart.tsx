"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, PriceScaleMode, createChart } from "lightweight-charts";
import type { GoogleDailyRow } from "@/lib/google-ads";
import styles from "./DessWeeklyReviewBoard.module.css";

type MetricId = "spend" | "revenue" | "clicks" | "impressions" | "conversions";

const METRICS: { id: MetricId; label: string; color: string }[] = [
  { id: "spend", label: "Cost", color: "#0369a1" },
  { id: "revenue", label: "Value", color: "#0f9f6e" },
  { id: "clicks", label: "Clicks", color: "#0ea5e9" },
  { id: "impressions", label: "Impressions", color: "#64748b" },
  { id: "conversions", label: "Conv.", color: "#d97706" },
];

export function DessTrendChart({ series }: { series: GoogleDailyRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<MetricId[]>(["spend", "revenue"]);
  const selected = useMemo(() => METRICS.filter((m) => on.includes(m.id)), [on]);

  useEffect(() => {
    const el = ref.current;
    if (!el || series.length < 2 || selected.length === 0) return;

    const chart = createChart(el, {
      autoSize: true,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#667085",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderVisible: false,
        mode: PriceScaleMode.Percentage,
      },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { horzLine: { labelBackgroundColor: "#0369a1" } },
    });

    for (const metric of selected) {
      const line = chart.addLineSeries({
        color: metric.color,
        lineWidth: 2,
        title: metric.label,
      });
      line.setData(series.map((r) => ({ time: r.date as never, value: Number(r[metric.id]) || 0 })));
    }
    chart.timeScale().fitContent();

    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [series, selected]);

  if (series.length < 2) return null;

  return (
    <section className={styles.card} style={{ marginBottom: 16 }}>
      <div className={styles.cardHead}>
        <h3>Daily trend</h3>
        <span>TradingView compare · percentage overlay</span>
      </div>
      <div className={styles.metricPick} role="group" aria-label="Daily chart metrics">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={on.includes(m.id) ? styles.chipOn : styles.chip}
            onClick={() =>
              setOn((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
            }
          >
            {m.label}
          </button>
        ))}
      </div>
      {selected.length ? <div ref={ref} className={styles.tvChart} /> : <p className={styles.chartHint}>Select at least one metric.</p>}
    </section>
  );
}
