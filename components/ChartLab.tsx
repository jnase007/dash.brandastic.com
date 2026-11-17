"use client";

import { useEffect, useMemo, useRef } from "react";
import { parseCustomRange } from "@/lib/format";

type Point = { t: number; date: string; spend: number };

function daysFromRange(range: string) {
  const custom = parseCustomRange(range);
  if (custom) {
    const a = Date.parse(custom.since);
    const b = Date.parse(custom.until);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      return Math.max(1, Math.round((b - a) / 86400000) + 1);
    }
  }
  const n = parseInt(range, 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function sampleSeries(days: number): Point[] {
  const out: Point[] = [];
  const end = Date.UTC(2026, 10, 17);
  const start = end - (days - 1) * 86400000;
  for (let i = 0; i < days; i++) {
    const t = start + i * 86400000;
    const spend = 420 + Math.round(180 * Math.sin(i / 6) + 90 * Math.sin(i / 13) + (i % 7) * 12);
    out.push({ t, date: new Date(t).toISOString().slice(0, 10), spend });
  }
  return out;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      }
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      el.dataset.loaded = "1";
      resolve();
    };
    el.onerror = () => reject(new Error(src));
    document.body.appendChild(el);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

export function ChartLab({ range }: { range: string }) {
  const days = daysFromRange(range);
  const data = useMemo(() => sampleSeries(days), [days]);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    let plot: any;
    let ro: ResizeObserver | undefined;

    async function boot() {
      await loadScript("https://unpkg.com/uplot@1.6.32/dist/uPlot.iife.min.js");
      loadCss("https://unpkg.com/uplot@1.6.32/dist/uPlot.min.css");
      if (dead || !host.current) return;
      const w = window as any;
      plot = new w.uPlot(
        {
          width: host.current.clientWidth || 600,
          height: 320,
          cursor: { drag: { x: false, y: false, setScale: false } },
          scales: { x: { time: true } },
          axes: [{ stroke: "#64748b" }, { stroke: "#64748b", size: 56 }],
          series: [
            {},
            { label: "Spend", stroke: "#1644ED", fill: "rgba(22,68,237,0.12)", width: 2 },
          ],
        },
        [data.map((p) => p.t / 1000), data.map((p) => p.spend)],
        host.current
      );
      ro = new ResizeObserver(() => plot.setSize({ width: host.current?.clientWidth || 600, height: 320 }));
      ro.observe(host.current);
    }

    boot().catch(() => {});
    return () => {
      dead = true;
      ro?.disconnect();
      plot?.destroy();
    };
  }, [data]);

  return (
    <div className="mt-8">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">uPlot</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Period is the selector above ({days} days). Hover for values. No date brushing on the chart.
        </p>
        <div ref={host} className="mt-3 h-[320px] w-full" />
      </section>
    </div>
  );
}
