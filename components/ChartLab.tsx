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

function iframeDoc(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body,#c{margin:0;height:100%;width:100%;font-family:system-ui,sans-serif}
  </style></head><body>${body}</body></html>`;
}

export function ChartLab() {
  const data = useMemo(sampleSeries, []);
  const tv = useRef<HTMLDivElement>(null);
  const up = useRef<HTMLDivElement>(null);

  const dates = JSON.stringify(data.map((p) => p.date));
  const spends = JSON.stringify(data.map((p) => p.spend));
  const rows = JSON.stringify(data);

  const echartsSrc = iframeDoc(`
<div id="c"></div>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"><\/script>
<script>
  const dates = ${dates};
  const spends = ${spends};
  const el = document.getElementById("c");
  const chart = echarts.init(el);
  chart.setOption({
    grid: { left: 48, right: 16, top: 24, bottom: 40 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: dates, boundaryGap: false },
    yAxis: { type: "value" },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, height: 18 }
    ],
    series: [{
      type: "line", name: "Spend", data: spends, smooth: true, symbol: "none",
      areaStyle: { color: "rgba(22,68,237,0.12)" },
      lineStyle: { color: "#1644ED", width: 2 }
    }]
  });
  window.addEventListener("resize", () => chart.resize());
<\/script>`);

  const amSrc = iframeDoc(`
<div id="c"></div>
<script type="module">
  import * as am5 from "https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5.22.0/+esm";
  import * as am5xy from "https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5.22.0/xy/+esm";
  const data = ${rows};
  const root = am5.Root.new("c");
  const chart = root.container.children.push(am5xy.XYChart.new(root, {
    panX: true, panY: false, wheelX: "panX", wheelY: "zoomX", pinchZoomX: true
  }));
  const xAxis = chart.xAxes.push(am5xy.DateAxis.new(root, {
    baseInterval: { timeUnit: "day", count: 1 },
    renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 50 })
  }));
  const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
    renderer: am5xy.AxisRendererY.new(root, {})
  }));
  const series = chart.series.push(am5xy.SmoothedXLineSeries.new(root, {
    name: "Spend", xAxis, yAxis, valueYField: "spend", valueXField: "t",
    stroke: am5.color(0x1644ed), fill: am5.color(0x1644ed)
  }));
  series.fills.template.setAll({ fillOpacity: 0.12, visible: true });
  series.data.setAll(data);
  chart.set("cursor", am5xy.XYCursor.new(root, { behavior: "zoomX", xAxis }));
  chart.set("scrollbarX", am5.Scrollbar.new(root, { orientation: "horizontal" }));
<\/script>`);

  useEffect(() => {
    let dead = false;
    const clean: Array<() => void> = [];
    async function boot() {
      await Promise.all([
        loadScript("https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"),
        loadScript("https://unpkg.com/uplot@1.6.32/dist/uPlot.iife.min.js"),
      ]);
      loadCss("https://unpkg.com/uplot@1.6.32/dist/uPlot.min.css");
      if (dead) return;
      const w = window as any;
      if (tv.current && w.LightweightCharts) {
        const chart = w.LightweightCharts.createChart(tv.current, {
          height: 280,
          layout: { background: { color: "#fff" }, textColor: "#334155" },
          grid: { vertLines: { color: "#eef2f7" }, horzLines: { color: "#eef2f7" } },
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
        chart.applyOptions({ width: tv.current.clientWidth || 600 });
        const ro = new ResizeObserver(() => chart.applyOptions({ width: tv.current?.clientWidth || 600 }));
        ro.observe(tv.current);
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
            series: [{}, { label: "Spend", stroke: "#1644ED", fill: "rgba(22,68,237,0.12)", width: 2 }],
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
    }
    boot().catch(() => {});
    return () => {
      dead = true;
      clean.forEach((fn) => fn());
    };
  }, [data]);

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">1. TradingView Lightweight Charts</h2>
        <p className="text-xs font-medium text-blue-700">Apache 2.0 · free · ~45KB</p>
        <p className="mt-1 text-sm text-neutral-600">Drag the plot or axis to zoom a range.</p>
        <div ref={tv} className="mt-3 h-[280px] w-full" />
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">2. uPlot</h2>
        <p className="text-xs font-medium text-blue-700">MIT · free · ~45KB</p>
        <p className="mt-1 text-sm text-neutral-600">Click-drag on X to zoom A→B. Double-click reset.</p>
        <div ref={up} className="mt-3 h-[280px] w-full" />
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">3. Apache ECharts</h2>
        <p className="text-xs font-medium text-blue-700">Apache 2.0 · free · heavier</p>
        <p className="mt-1 text-sm text-neutral-600">Drag the line or the slider to pick a window.</p>
        <iframe title="ECharts preview" className="mt-3 h-[300px] w-full rounded-lg border-0 bg-white" srcDoc={echartsSrc} />
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">4. amCharts 5</h2>
        <p className="text-xs font-medium text-blue-700">Free with logo · paid to remove watermark</p>
        <p className="mt-1 text-sm text-neutral-600">Click-drag to zoom X. Scrollbar under the plot.</p>
        <iframe title="amCharts preview" className="mt-3 h-[300px] w-full rounded-lg border-0 bg-white" srcDoc={amSrc} />
      </section>
      <p className="text-xs text-neutral-500">
        Lightweight Charts or uPlot if we want small files. ECharts if we need more chart types. amCharts only if we accept the logo or buy a license.
      </p>
    </div>
  );
}
