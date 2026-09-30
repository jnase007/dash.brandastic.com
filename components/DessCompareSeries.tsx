"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, PriceScaleMode, createChart } from "lightweight-charts";
import { roas, type PeriodMetrics } from "@/lib/dess-weekly-review";
import styles from "./DessWeeklyReviewBoard.module.css";

type MetricId = "cost" | "clicks" | "ctr" | "cpc" | "conv" | "value" | "cr" | "roas" | "impShare";

const METRICS: { id: MetricId; label: string; color: string; value: (m: PeriodMetrics) => number | null }[] = [
  { id: "cost", label: "Cost", color: "#0369a1", value: (m) => m.cost },
  { id: "clicks", label: "Clicks", color: "#0ea5e9", value: (m) => m.clicks },
  { id: "ctr", label: "CTR", color: "#6366f1", value: (m) => (m.impressions ? m.clicks / m.impressions : null) },
  { id: "cpc", label: "CPC", color: "#64748b", value: (m) => m.cpc },
  { id: "conv", label: "Conv.", color: "#d97706", value: (m) => m.conversions || 0 },
  { id: "value", label: "Value", color: "#0f9f6e", value: (m) => m.convValue },
  { id: "cr", label: "CR", color: "#db2777", value: (m) => (m.clicks ? (m.conversions || 0) / m.clicks : null) },
  { id: "roas", label: "ROAS", color: "#7c3aed", value: (m) => roas(m.cost, m.convValue) },
  { id: "impShare", label: "Imp. share", color: "#0f766e", value: (m) => m.searchImpShare },
];

export function DessCompareSeries({
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
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<MetricId[]>(["cost", "value", "clicks"]);
  const selected = useMemo(() => METRICS.filter((m) => on.includes(m.id)), [on]);

  useEffect(() => {
    const el = ref.current;
    if (!el || selected.length === 0) return;

    const chart = createChart(el, {
      autoSize: true,
      height: 260,
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
      timeScale: {
        borderVisible: false,
        timeVisible: false,
        tickMarkFormatter: (time: string) => (String(time) === "2020-01-01" ? "Compare" : "Current"),
      },
      crosshair: { horzLine: { labelBackgroundColor: "#0369a1" } },
    });

    for (const metric of selected) {
      const a = metric.value(prior);
      const b = metric.value(now);
      if (a == null || b == null) continue;
      const series = chart.addLineSeries({
        color: metric.color,
        lineWidth: 2,
        title: metric.label,
      });
      series.setData([
        { time: "2020-01-01" as never, value: Number(a) || 0 },
        { time: "2020-01-02" as never, value: Number(b) || 0 },
      ]);
    }
    chart.timeScale().fitContent();
    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [now, prior, selected]);

  function toggle(id: MetricId) {
    setOn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className={styles.chartWrap}>
      <div className={styles.metricPick} role="group" aria-label="Chart metrics">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={on.includes(m.id) ? styles.chipOn : styles.chip}
            onClick={() => toggle(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className={styles.chartHint}>
        TradingView compare (percentage). {priorLabel} → {nowLabel}. Pick metrics to overlay.
      </p>
      {selected.length ? <div ref={ref} className={styles.tvChart} /> : <p className={styles.chartHint}>Select at least one metric.</p>}
    </div>
  );
}
