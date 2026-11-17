"use client";

import { useEffect, useMemo, useRef } from "react";

type Point = { t: number; date: string; spend: number; results: number };

function sampleSeries(): Point[] {
  const out: Point[] = [];
  const start = Date.UTC(2026, 8, 18);
  for (let i = 0; i < 60; i++) {
    const t = start + i * 86400000;
    const spend = 420 + Math.round(180 * Math.sin(i / 6) + 90 * Math.sin(i / 13) + (i % 7) * 12);
    const results = Math.max(2, Math.round(spend / 95 + (i % 5) - 1));
    out.push({
      t,
      date: new Date(t).toISOString().slice(0, 10),
      spend,
      results,
    });
  }
  return out;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
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
  const tv = useRef<HTMLDivElement>(null);
  const up = useRef<HTMLDivElement>(null);
  const ec = useRef<HTMLDivElement>(null);
  const am = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    const clean: Array<() => void> = [];

    async function boot() {
      await Promise.all([
        loadScript("https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"),
        loadScript("https://unpkg.com/uplot@1.6.32/dist/uPlot.iife.min.js"),
        loadScript("https://unpkg.com/echarts@5.6.0/dist/echarts.min.js"),
        loadScript("https://cdn.amcharts.com/lib/5/index.js"),
      ]);
      await loadScript("https://cdn.amcharts.com/lib/5/xy.js");
      loadCss("https://unpkg.com/uplot@1.6.32/dist/uPlot.min.css");
      if (dead) return;

      const w = window as any;

      if (tv.current && w.LightweightCharts) {
        const chart = w.LightweightCharts.createChart(tv.current, {
          height: 280,
          layout: { background: { color: "#fff" }, textColor: "#334155" },
          grid: { vertLines: { color: "#eef2f7" }, horzLines: { color: "#eef2f7" } },
          rightPriceScale: { borderColor: "#e2e8f0" },
          timeScale: { borderColor: "#e2e8f0" },
          handleScroll: { mouseWheel: true, pressedMouseMove: true },
          handleScale: { axisPressedMouseMove: true, mouseWheel: true },
        });
        const series = chart.addAreaSeries({
          lineColor: "#1644ED",
          topColor: "rgba(22,68,237,0.28)",
          bottomColor: "rgba(22,68,237,0.02)",
        });
        series.setData(data.map((p) => ({ time: p.date, value: p.spend })));
        chart.timeScale().fitContent();
        const ro = new ResizeObserver(() => chart.applyOptions({ width: tv.current?.clientWidth || 600 }));
        ro.observe(tv.current);
        chart.applyOptions({ width: tv.current.clientWidth });
        clean.push(() => {
          ro.disconnect();
          chart.remove();
        });
      }

      if (up.current && w.uPlot) {
        const plot = new w.uPlot(
          {
            width: up.current.clientWidth || 600,
            height: 280,
            cursor: { drag: { x: true, y: false } },
            scales: { x: { time: true } },
            axes: [{}, { size: 56 }],
            series: [
              {},
              { label: "Spend", stroke: "#1644ED", fill: "rgba(22,68,237,0.12)", width: 2 },
            ],
            plugins: [],
          },
          [data.map((p) => p.t / 1000), data.map((p) => p.spend)],
          up.current
        );
        const ro = new ResizeObserver(() => plot.setSize({ width: up.current?.clientWidth || 600, height: 280 }));
        ro.observe(up.current);
        clean.push(() => {
          ro.disconnect();
          plot.destroy();
        });
      }

      if (ec.current && w.echarts) {
        const chart = w.echarts.init(ec.current);
        chart.setOption({
          grid: { left: 48, right: 16, top: 24, bottom: 48 },
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: data.map((p) => p.date), boundaryGap: false },
          yAxis: { type: "value" },
          dataZoom: [
            { type: "inside", start: 0, end: 100 },
            { type: "slider", start: 0, end: 100, height: 18 },
          ],
          series: [
            {
              type: "line",
              name: "Spend",
              data: data.map((p) => p.spend),
              smooth: true,
              symbol: "none",
              areaStyle: { color: "rgba(22,68,237,0.12)" },
              lineStyle: { color: "#1644ED", width: 2 },
            },
          ],
        });
        const ro = new ResizeObserver(() => chart.resize());
        ro.observe(ec.current);
        clean.push(() => {
          ro.disconnect();
          chart.dispose();
        });
      }

      if (am.current && w.am5 && w.am5xy) {
        const root = w.am5.Root.new(am.current);
        const chart = root.container.children.push(
          w.am5xy.XYChart.new(root, {
            panX: true,
            panY: false,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true,
            paddingLeft: 0,
          })
        );
        const xAxis = chart.xAxes.push(
          w.am5xy.DateAxis.new(root, {
            baseInterval: { timeUnit: "day", count: 1 },
            renderer: w.am5xy.AxisRendererX.new(root, { minGridDistance: 60 }),
          })
        );
        const yAxis = chart.yAxes.push(
          w.am5xy.ValueAxis.new(root, {
            renderer: w.am5xy.AxisRendererY.new(root, {}),
          })
        );
        const series = chart.series.push(
          w.am5xy.SmoothedXLineSeries.new(root, {
            name: "Spend",
            xAxis,
            yAxis,
            valueYField: "spend",
            valueXField: "t",
            stroke: w.am5.color(0x1644ed),
            fill: w.am5.color(0x1644ed),
          })
        );
        series.fills.template.setAll({ fillOpacity: 0.12, visible: true });
        series.data.setAll(data);
        chart.set(
          "cursor",
          w.am5xy.XYCursor.new(root, {
            behavior: "zoomX",
            xAxis,
          })
        );
        chart.set(
          "scrollbarX",
          w.am5.Scrollbar.new(root, { orientation: "horizontal" })
        );
        clean.push(() => root.dispose());
      }
    }

    boot().catch(() => {});
    return () => {
      dead = true;
      clean.forEach((fn) => fn());
    };
  }, [data]);

  const cards = [
    {
      title: "1. TradingView Lightweight Charts",
      license: "Apache 2.0 · free · ~45KB",
      note: "Built for time series. Drag the plot or axis to zoom a range. Fast on mobile.",
      ref: tv,
    },
    {
      title: "2. uPlot",
      license: "MIT · free · ~45KB",
      note: "Smallest and fastest. Click-drag on the x axis to zoom A→B. Reset with double-click.",
      ref: up,
    },
    {
      title: "3. Apache ECharts",
      license: "Apache 2.0 · free · heavier (~300KB)",
      note: "Drag on the chart or the slider to pick a window. Best if we need many chart types later.",
      ref: ec,
    },
    {
      title: "4. amCharts 5",
      license: "Free with logo · paid to remove watermark",
      note: "Click-drag to zoom X. Scrollbar under the plot. Strong UX; not fully free for production without a license.",
      ref: am,
    },
  ];

  return (
    <div className="mt-8 grid gap-6">
      {cards.map((card) => (
        <section key={card.title} className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{card.title}</h2>
          <p className="text-xs font-medium text-blue-700">{card.license}</p>
          <p className="mt-1 text-sm text-neutral-600">{card.note}</p>
          <div ref={card.ref} className="mt-3 h-[280px] w-full" />
        </section>
      ))}
      <p className="text-xs text-neutral-500">
        Recommendation if we want drag-range + light files: Lightweight Charts or uPlot. ECharts if we need more chart types. amCharts only if we accept the logo or buy a license.
      </p>
    </div>
  );
}
