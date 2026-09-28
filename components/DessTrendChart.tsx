"use client";

import { useEffect, useRef } from "react";
import { ColorType, createChart } from "lightweight-charts";
import type { GoogleDailyRow } from "@/lib/google-ads";
import styles from "./DessWeeklyReviewBoard.module.css";

export function DessTrendChart({ series }: { series: GoogleDailyRow[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || series.length < 2) return;

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
      rightPriceScale: { borderVisible: false },
      leftPriceScale: { visible: true, borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { horzLine: { labelBackgroundColor: "#0369a1" } },
    });

    const spend = chart.addAreaSeries({
      lineColor: "#0369a1",
      topColor: "rgba(3, 105, 161, 0.28)",
      bottomColor: "rgba(3, 105, 161, 0.02)",
      lineWidth: 2,
      priceScaleId: "left",
    });
    const value = chart.addLineSeries({
      color: "#0f9f6e",
      lineWidth: 2,
      priceScaleId: "right",
    });

    spend.setData(series.map((r) => ({ time: r.date as never, value: r.spend })));
    value.setData(series.map((r) => ({ time: r.date as never, value: r.revenue })));
    chart.timeScale().fitContent();

    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [series]);

  if (series.length < 2) return null;

  return (
    <section className={styles.card} style={{ marginBottom: 16 }}>
      <div className={styles.cardHead}>
        <h3>Daily trend</h3>
        <span>Cost (blue) · conversion value (green)</span>
      </div>
      <div ref={ref} className={styles.tvChart} />
    </section>
  );
}
