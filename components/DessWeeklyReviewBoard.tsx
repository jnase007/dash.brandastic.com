"use client";

import { Suspense, useMemo, useState } from "react";
import { RangeSelect } from "@/components/RangeSelect";
import { DessCompareBars } from "@/components/DessCompareBars";
import { DessMixChart } from "@/components/DessMixChart";
import { DessTrendChart } from "@/components/DessTrendChart";
import { roas, type CampaignReview, type ChangeSet, type PeriodKey, type PeriodMetrics } from "@/lib/dess-weekly-review";
import type { DessWeeklyLive } from "@/lib/load-dess-weekly-review";
import styles from "./DessWeeklyReviewBoard.module.css";

type Compare = "yoy" | "mom";
type SortKey = "cost" | "value" | "roas" | "clicks" | "change";

const money0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const money2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const int = new Intl.NumberFormat("en-US");

function money(n: number, digits = 0) {
  return (digits === 0 ? money0 : money2).format(n);
}

function pct(n: number | null | undefined, signed = true) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = n * 100;
  const body = `${Math.abs(v).toFixed(1)}%`;
  if (!signed) return body;
  if (v > 0) return `+${body}`;
  if (v < 0) return `−${body}`;
  return "0.0%";
}

function tone(n: number | null | undefined, invert = false) {
  if (n == null) return "flat";
  const v = invert ? -n : n;
  if (v > 0.005) return "up";
  if (v < -0.005) return "down";
  return "flat";
}

function periodOf(c: CampaignReview, key: PeriodKey): PeriodMetrics {
  if (key === "yoy") return c.yoy;
  if (key === "lmtd") return c.lmtd;
  return c.mtd;
}

function changeOf(c: CampaignReview, compare: Compare): ChangeSet {
  return compare === "yoy" ? c.yoyChange : c.momChange;
}

function campaignRoas(c: CampaignReview) {
  return roas(c.mtd.cost, c.mtd.convValue);
}

export function DessWeeklyReviewBoard({ data, range }: { data: DessWeeklyLive; range: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("cost");
  const [open, setOpen] = useState<string | null>(data.campaigns[0]?.name ?? null);
  const [hideZero, setHideZero] = useState(true);
  const [accountCompare, setAccountCompare] = useState<Compare>("mom");
  const [campaignCompare, setCampaignCompare] = useState<Record<string, Compare>>({});
  const [campaignView, setCampaignView] = useState<Record<string, "table" | "line">>({});

  const compareFor = (name: string): Compare => campaignCompare[name] || "mom";

  const campaigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data.campaigns.filter((c) => {
      if (hideZero && c.inactive) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      if (sort === "cost") return b.mtd.cost - a.mtd.cost;
      if (sort === "value") return b.mtd.convValue - a.mtd.convValue;
      if (sort === "clicks") return b.mtd.clicks - a.mtd.clicks;
      if (sort === "roas") return (campaignRoas(b) || 0) - (campaignRoas(a) || 0);
      const ac = changeOf(a, compareFor(a.name)).convValue;
      const bc = changeOf(b, compareFor(b.name)).convValue;
      return (bc || -999) - (ac || -999);
    });
    return rows;
  }, [campaignCompare, data.campaigns, hideZero, query, sort]);

  const liveCampaigns = data.campaigns.filter((c) => !c.inactive);
  const accountRoas = data.roas;
  const accountKey: PeriodKey = accountCompare === "yoy" ? "yoy" : "lmtd";
  const accountShort = accountCompare === "yoy" ? "vs last year" : "vs last month";

  return (
    <div className={styles.board}>
      <section className={styles.hero}>
        <div>
          <div className={styles.kicker}>DESS USA · Google Ads</div>
          <h1>{data.title}</h1>
          <p>
            {data.periodLabel} · vs last month {data.compareMonthLabel} · account {data.account}
            {data.source === "snapshot" ? " · snapshot fallback" : ""}
          </p>
        </div>
        <div className={styles.heroActions}>
          <Suspense fallback={<div className={styles.print}>Dates…</div>}>
            <RangeSelect value={range} />
          </Suspense>
          <button type="button" className={styles.print} onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </section>

      <section className={styles.kpis}>
        <Kpi
          label="Conversion value"
          value={money(data.conversionValue.mtd)}
          change={accountCompare === "yoy" ? data.conversionValue.yoyChange : data.conversionValue.momChange}
          sub={`${money(accountCompare === "yoy" ? data.conversionValue.yoy : data.conversionValue.lmtd)} ${accountShort}`}
        />
        <Kpi
          label="Cost"
          value={money(data.totals.mtd.cost)}
          change={changeOf(data.totals, accountCompare).cost}
          sub={`${money(periodOf(data.totals, accountKey).cost)} ${accountShort}`}
          invert
        />
        <Kpi label="ROAS" value={`${accountRoas.toFixed(1)}x`} sub="Account return on ad spend" good />
        <Kpi
          label="Clicks"
          value={int.format(data.totals.mtd.clicks)}
          change={changeOf(data.totals, accountCompare).clicks}
          sub={`CPC ${money(data.totals.mtd.cpc, 2)}`}
        />
        <Kpi
          label="Search impression share"
          value={data.totals.mtd.searchImpShare == null ? "—" : `${data.totals.mtd.searchImpShare.toFixed(1)}%`}
          change={changeOf(data.totals, accountCompare).searchImpShare}
          sub={
            periodOf(data.totals, accountKey).searchImpShare == null
              ? accountShort
              : `${periodOf(data.totals, accountKey).searchImpShare?.toFixed(1)}% ${accountShort}`
          }
        />
        <Kpi
          label="Impressions"
          value={int.format(data.totals.mtd.impressions)}
          change={changeOf(data.totals, accountCompare).impressions}
          sub={`${int.format(periodOf(data.totals, accountKey).impressions)} ${accountShort}`}
        />
      </section>

      <DessTrendChart series={data.daily || []} />

      <section className={styles.toolbar}>
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a campaign"
        />
        <div className={styles.sorts}>
          {(
            [
              ["cost", "Cost"],
              ["value", "Value"],
              ["roas", "ROAS"],
              ["clicks", "Clicks"],
              ["change", "Value change"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={sort === key ? styles.chipOn : styles.chip}
              onClick={() => setSort(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
          Hide zero-spend
        </label>
      </section>

      <section className={styles.list}>
        {campaigns.map((c) => {
          const compare = compareFor(c.name);
          const compareKey: PeriodKey = compare === "yoy" ? "yoy" : "lmtd";
          const prior = periodOf(c, compareKey);
          const change = changeOf(c, compare);
          const r = campaignRoas(c);
          const isOpen = open === c.name;
          const view = campaignView[c.name] || "table";
          const compareLabel = compare === "yoy" ? data.compareYearLabel : data.compareMonthLabel;
          const compareShort = compare === "yoy" ? "vs last year" : "vs last month";
          return (
            <article
              key={c.name}
              className={`${styles.campaign} ${isOpen ? styles.campaignOpen : ""} ${c.inactive ? styles.inactive : ""}`}
            >
              <div className={styles.campaignTop}>
                <button
                  type="button"
                  className={styles.campaignBtn}
                  onClick={() => setOpen(isOpen ? null : c.name)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.campaignTitle}>
                    <strong>{c.name}</strong>
                    <div className={styles.tags}>
                      {c.newThisYear ? <span className={styles.tagNew}>New vs last year</span> : null}
                      {c.inactive ? <span className={styles.tagOff}>No spend this window</span> : null}
                      {r != null && r >= 15 ? <span className={styles.tagGood}>{r.toFixed(1)}x ROAS</span> : null}
                      {r != null && r < 5 && c.mtd.cost > 0 ? (
                        <span className={styles.tagWarn}>{r.toFixed(1)}x ROAS</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.campaignNums}>
                    <Stat label="Cost" value={money(c.mtd.cost)} change={change.cost} invert />
                    <Stat label="Value" value={money(c.mtd.convValue)} change={change.convValue} />
                    <Stat label="ROAS" value={r == null ? "—" : `${r.toFixed(1)}x`} />
                    <Stat label="Clicks" value={int.format(c.mtd.clicks)} change={change.clicks} />
                  </div>
                </button>
                <div className={styles.campaignToggles}>
                  <CompareToggle
                    value={compare}
                    onChange={(next) => setCampaignCompare((prev) => ({ ...prev, [c.name]: next }))}
                    compact
                  />
                  <ViewToggle
                    value={view}
                    onChange={(next) => setCampaignView((prev) => ({ ...prev, [c.name]: next }))}
                  />
                </div>
              </div>
              {isOpen ? (
                <div className={styles.detail}>
                  {view === "line" ? (
                    <DessCompareBars now={c.mtd} prior={prior} nowLabel={data.periodLabel} priorLabel={compareLabel} />
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th></th>
                          <th>Cost</th>
                          <th>Clicks</th>
                          <th>CTR</th>
                          <th>CPC</th>
                          <th>Conv.</th>
                          <th>Value</th>
                          <th>Conv. rate</th>
                          <th>ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={styles.nowRow}>
                          <td>Current · {data.periodLabel}</td>
                          <MetricCells m={c.mtd} />
                        </tr>
                        <tr className={styles.priorRow}>
                          <td>{compareLabel}</td>
                          <MetricCells m={prior} />
                        </tr>
                        <tr className={styles.changeRow}>
                          <td>{compareShort}</td>
                          <td className={styles[tone(change.cost, true)]}>{pct(change.cost)}</td>
                          <td className={styles[tone(change.clicks)]}>{pct(change.clicks)}</td>
                          <td className={styles[tone(rateDelta(ctr(c.mtd), ctr(prior)))]}>
                            {pct(rateDelta(ctr(c.mtd), ctr(prior)))}
                          </td>
                          <td className={styles[tone(change.cpc, true)]}>{pct(change.cpc)}</td>
                          <td className={styles[tone(change.conversions ?? null)]}>{pct(change.conversions ?? null)}</td>
                          <td className={styles[tone(change.convValue)]}>{pct(change.convValue)}</td>
                          <td className={styles[tone(rateDelta(convRate(c.mtd), convRate(prior)))]}>
                            {pct(rateDelta(convRate(c.mtd), convRate(prior)))}
                          </td>
                          <td className={styles[tone(roasDelta(c.mtd, prior))]}>{pct(roasDelta(c.mtd, prior))}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
        {!campaigns.length ? <div className={styles.empty}>No campaigns match that filter.</div> : null}
      </section>

      <section className={styles.mix}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Spend</h3>
            <span>{liveCampaigns.length} live campaigns</span>
          </div>
          <DessMixChart
            rows={liveCampaigns}
            value={(c) => c.mtd.cost}
            format={(n) => money(n)}
            open={open}
            onOpen={setOpen}
          />
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Conversion value</h3>
            <span>Current window</span>
          </div>
          <DessMixChart
            rows={liveCampaigns}
            value={(c) => c.mtd.convValue}
            format={(n) => money(n)}
            open={open}
            onOpen={setOpen}
          />
        </div>
      </section>
    </div>
  );
}

function ctr(m: PeriodMetrics) {
  if (!m.impressions) return null;
  return m.clicks / m.impressions;
}

function convRate(m: PeriodMetrics) {
  if (!m.clicks) return null;
  return (m.conversions || 0) / m.clicks;
}

function rateDelta(now: number | null, prior: number | null) {
  if (now == null || prior == null || prior === 0) return null;
  return (now - prior) / prior;
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "table" | "line";
  onChange: (next: "table" | "line") => void;
}) {
  return (
    <div className={styles.toggleSmall} role="tablist" aria-label="View">
      <button type="button" className={value === "table" ? styles.onMom : ""} onClick={() => onChange("table")}>
        Table
      </button>
      <button type="button" className={value === "line" ? styles.on : ""} onClick={() => onChange("line")}>
        Chart
      </button>
    </div>
  );
}

function CompareToggle({
  value,
  onChange,
  compact,
}: {
  value: Compare;
  onChange: (next: Compare) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? styles.toggleSmall : styles.toggle} role="tablist" aria-label="Comparison">
      <button type="button" className={value === "mom" ? styles.onMom : ""} onClick={() => onChange("mom")}>
        vs month
      </button>
      <button type="button" className={value === "yoy" ? styles.on : ""} onClick={() => onChange("yoy")}>
        vs year
      </button>
    </div>
  );
}

function roasDelta(current: PeriodMetrics, prior: PeriodMetrics) {
  const a = roas(current.cost, current.convValue);
  const b = roas(prior.cost, prior.convValue);
  if (a == null || b == null || b === 0) return null;
  return (a - b) / b;
}

function MetricCells({ m }: { m: PeriodMetrics }) {
  const r = roas(m.cost, m.convValue);
  const clickRate = ctr(m);
  const cr = convRate(m);
  return (
    <>
      <td>{money(m.cost)}</td>
      <td>{int.format(m.clicks)}</td>
      <td>{clickRate == null ? "—" : `${(clickRate * 100).toFixed(2)}%`}</td>
      <td>{m.cost || m.clicks ? money(m.cpc, 2) : "—"}</td>
      <td>{int.format(m.conversions || 0)}</td>
      <td>{money(m.convValue)}</td>
      <td>{cr == null ? "—" : `${(cr * 100).toFixed(2)}%`}</td>
      <td>{r == null ? "—" : `${r.toFixed(1)}x`}</td>
    </>
  );
}

function Kpi({
  label,
  value,
  change,
  sub,
  invert,
  good,
}: {
  label: string;
  value: string;
  change?: number | null;
  sub?: string;
  invert?: boolean;
  good?: boolean;
}) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiTop}>
        <span>{label}</span>
        {change != null ? (
          <em className={styles[tone(change, invert)]}>{pct(change)}</em>
        ) : good ? (
          <em className={styles.up}>Strong</em>
        ) : null}
      </div>
      <strong>{value}</strong>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  change,
  invert,
}: {
  label: string;
  value: string;
  change?: number | null;
  invert?: boolean;
}) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <b>{value}</b>
      {change != null ? <em className={styles[tone(change, invert)]}>{pct(change)}</em> : <em className={styles.flat}> </em>}
    </div>
  );
}
