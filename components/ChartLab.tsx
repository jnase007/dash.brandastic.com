"use client";

import { useEffect, useMemo, useRef } from "react";

type Point = { t: number; date: string; spend: number };

function sampleSeries(): Point[] {
  const out: Point[] = [];
  const start = Date.UTC(2026, 8, 18);
  for (let i = 0; i < 60; i++) {
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

export function ChartLab() {
  const data = useMemo(sampleSeries, []);
  const host = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);

  const resetZoom = () => {
    const plot = plotRef.current;
    if (!plot) return;
    plot.setScale("x", { min: data[0].t / 1000, max: data[data.length - 1].t / 1000 });
  };

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
          cursor: { drag: { x: true, y: false } },
          scales: { x: { time: true } },
          axes: [
            { stroke: "#64748b" },
            { stroke: "#64748b", size: 56 },
          ],
          series: [
            {},
            { label: "Spend", stroke: "#1644ED", fill: "rgba(22,68,237,0.12)", width: 2 },
          ],
        },
        [data.map((p) => p.t / 1000), data.map((p) => p.spend)],
        host.current
      );
      plotRef.current = plot;
      ro = new ResizeObserver(() => plot.setSize({ width: host.current?.clientWidth || 600, height: 320 }));
      ro.observe(host.current);
    }

    boot().catch(() => {});
    return () => {
      dead = true;
      ro?.disconnect();
      plot?.destroy();
      plotRef.current = null;
    };
  }, [data]);

  return (
    <div className="mt-8">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">uPlot</h2>
            <p className="text-xs font-medium text-blue-700">MIT · free · ~45KB</p>
          </div>
          <button
            type="button"
            onClick={resetZoom}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reset / show all days
          </button>
        </div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
          <li>Click and drag left or right on the chart to zoom that date range (point A to B).</li>
          <li>Click <b>Reset / show all days</b> to go back in time to the full 60 days. Double-click the plot also resets.</li>
        </ol>
        <div ref={host} className="mt-3 h-[320px] w-full" />
      </section>
    </div>
  );
}
