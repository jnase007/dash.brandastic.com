"use client";

import { useMemo, useState } from "react";
import {
  DESS_WEEKLY_REVIEW as DATA,
  roas,
  type CampaignReview,
  type ChangeSet,
  type PeriodKey,
  type PeriodMetrics,
} from "@/lib/dess-weekly-review";
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

function periodOf(c: CampaignReview | typeof DATA.totals, key: PeriodKey): PeriodMetrics {
  if (key === "yoy") return c.yoy;
  if (key === "lmtd") return c.lmtd;
  return c.mtd;
}

function changeOf(c: CampaignReview | typeof DATA.totals, compare: Compare): ChangeSet {
  return compare === "yoy" ? c.yoyChange : c.momChange;
}

function campaignRoas(c: CampaignReview) {
  return roas(c.mtd.cost, c.mtd.convValue);
}

export function DessWeeklyReviewBoard() {
  const [compare, setCompare] = useState<Compare>("yoy");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("cost");
  const [open, setOpen] = useState<string | null>(DATA.campaigns[0]?.name ?? null);
  const [hideZero, setHideZero] = useState(true);

  const compareKey: PeriodKey = compare === "yoy" ? "yoy" : "lmtd";
  const compareLabel = compare === "yoy" ? DATA.compareYearLabel : DATA.compareMonthLabel;
  const compareShort = compare === "yoy" ? "vs last year" : "vs last month";

  const campaigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = DATA.campaigns.filter((c) => {
      if (hideZero && c.inactive) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
    const dir = (n: number) => n;
    rows.sort((a, b) => {
      if (sort === "cost") return dir(b.mtd.cost - a.mtd.cost);
      if (sort === "value") return dir(b.mtd.convValue - a.mtd.convValue);
      if (sort === "clicks") return dir(b.mtd.clicks - a.mtd.clicks);
      if (sort === "roas") return dir((campaignRoas(b) || 0) - (campaignRoas(a) || 0));
      const ac = changeOf(a, compare).convValue;
      const bc = changeOf(b, compare).convValue;
      return dir((bc || -999) - (ac || -999));
    });
    return rows;
  }, [compare, hideZero, query, sort]);

  const maxCost = Math.max(...DATA.campaigns.map((c) => c.mtd.cost), 1);
  const maxValue = Math.max(...DATA.campaigns.map((c) => c.mtd.convValue), 1);
  const liveCampaigns = DATA.campaigns.filter((c) => !c.inactive);
  const accountRoas = DATA.roas;

  return (
    <div className={styles.board}>
      <section className={styles.hero}>
        <div>
          <div className={styles.kicker}>DESS USA · Google Ads</div>
          <h1>{DATA.title}</h1>
          <p>
            {DATA.periodLabel} full month · account {DATA.account} · built for the weekly review
          </p>
        </div>
        <div className={styles.heroActions}>
          <div className={styles.toggle} role="tablist" aria-label="Comparison">
            <button
              type="button"
              className={compare === "yoy" ? styles.on : ""}
              onClick={() => setCompare("yoy")}
            >
              vs last year
            </button>
            <button
              type="button"
              className={compare === "mom" ? styles.onMom : ""}
              onClick={() => setCompare("mom")}
            >
              vs last month
            </button>
          </div>
          <button type="button" className={styles.print} onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </section>

      <section className={styles.kpis}>
        <Kpi
          label="Conversion value"
          value={money(DATA.conversionValue.mtd)}
          change={compare === "yoy" ? DATA.conversionValue.yoyChange : DATA.conversionValue.momChange}
          sub={`${money(compare === "yoy" ? DATA.conversionValue.yoy : DATA.conversionValue.lmtd)} ${compareShort}`}
        />
        <Kpi
          label="Spend"
          value={money(DATA.totals.mtd.cost)}
          change={changeOf(DATA.totals, compare).cost}
          sub={`${money(periodOf(DATA.totals, compareKey).cost)} ${compareShort}`}
          invert
        />
        <Kpi
          label="ROAS"
          value={`${accountRoas.toFixed(1)}x`}
          sub="Account return on ad spend"
          good
        />
        <Kpi
          label="Clicks"
          value={int.format(DATA.totals.mtd.clicks)}
          change={changeOf(DATA.totals, compare).clicks}
          sub={`CPC ${money(DATA.totals.mtd.cpc, 2)}`}
        />
        <Kpi
          label="Search impression share"
          value={`${DATA.totals.mtd.searchImpShare.toFixed(1)}%`}
          change={changeOf(DATA.totals, compare).searchImpShare}
          sub={`${periodOf(DATA.totals, compareKey).searchImpShare?.toFixed(1)}% ${compareShort}`}
        />
        <Kpi
          label="Impressions"
          value={int.format(DATA.totals.mtd.impressions)}
          change={changeOf(DATA.totals, compare).impressions}
          sub={`${int.format(periodOf(DATA.totals, compareKey).impressions)} ${compareShort}`}
        />
      </section>

      <section className={styles.story}>
        <Talk
          title="What held up"
          items={[
            `Account ROAS is still ${accountRoas.toFixed(1)}x on $${int.format(Math.round(DATA.totals.mtd.cost))} spend.`,
            compare === "yoy"
              ? "Conversion value is up 12.1% versus August 2025."
              : "Spend is essentially flat versus July (−1.7%).",
            "PMax remarketing is the YoY standout: spend up, value up 84%.",
          ]}
        />
        <Talk
          title="What to discuss"
          items={[
            compare === "yoy"
              ? "Spend is +73% versus last year, so efficiency is carrying a bigger book."
              : "Conversion value is −32% versus July. Brand, Compatibilities, Search, and Dental Implants all dropped.",
            "Brand still makes the most value ($156k), but it is down about a third versus both last year and July.",
            "Shopping Premilled is off. Lead gen PMax is smaller and less valuable than last year.",
          ]}
        />
      </section>

      <section className={styles.mix}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Spend mix</h3>
            <span>{liveCampaigns.length} live campaigns</span>
          </div>
          <MixBars
            rows={liveCampaigns}
            value={(c) => c.mtd.cost}
            max={maxCost}
            format={(n) => money(n)}
            open={open}
            onOpen={setOpen}
          />
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Value mix</h3>
            <span>August conversion value</span>
          </div>
          <MixBars
            rows={liveCampaigns}
            value={(c) => c.mtd.convValue}
            max={maxValue}
            format={(n) => money(n)}
            open={open}
            onOpen={setOpen}
          />
        </div>
      </section>

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
              ["cost", "Spend"],
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
          <input
            type="checkbox"
            checked={hideZero}
            onChange={(e) => setHideZero(e.target.checked)}
          />
          Hide zero-spend
        </label>
      </section>

      <section className={styles.list}>
        {campaigns.map((c) => {
          const prior = periodOf(c, compareKey);
          const change = changeOf(c, compare);
          const r = campaignRoas(c);
          const isOpen = open === c.name;
          return (
            <article
              key={c.name}
              className={`${styles.campaign} ${isOpen ? styles.campaignOpen : ""} ${c.inactive ? styles.inactive : ""}`}
            >
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
                    {c.inactive ? <span className={styles.tagOff}>Off in August</span> : null}
                    {r != null && r >= 15 ? <span className={styles.tagGood}>{r.toFixed(1)}x ROAS</span> : null}
                    {r != null && r < 5 && c.mtd.cost > 0 ? (
                      <span className={styles.tagWarn}>{r.toFixed(1)}x ROAS</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.campaignNums}>
                  <Stat label="Spend" value={money(c.mtd.cost)} change={change.cost} invert />
                  <Stat label="Value" value={money(c.mtd.convValue)} change={change.convValue} />
                  <Stat label="ROAS" value={r == null ? "—" : `${r.toFixed(1)}x`} />
                  <Stat label="Clicks" value={int.format(c.mtd.clicks)} change={change.clicks} />
                </div>
              </button>
              {isOpen ? (
                <div className={styles.detail}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Spend</th>
                        <th>Impr.</th>
                        <th>Clicks</th>
                        <th>CPC</th>
                        <th>IS</th>
                        <th>Value</th>
                        <th>ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>August 2026</td>
                        <MetricCells m={c.mtd} />
                      </tr>
                      <tr>
                        <td>{compareLabel}</td>
                        <MetricCells m={prior} />
                      </tr>
                      <tr className={styles.changeRow}>
                        <td>{compareShort}</td>
                        <td className={styles[tone(change.cost, true)]}>{pct(change.cost)}</td>
                        <td className={styles[tone(change.impressions)]}>{pct(change.impressions)}</td>
                        <td className={styles[tone(change.clicks)]}>{pct(change.clicks)}</td>
                        <td className={styles[tone(change.cpc, true)]}>{pct(change.cpc)}</td>
                        <td className={styles[tone(change.searchImpShare)]}>
                          {change.searchImpShare == null
                            ? "—"
                            : `${change.searchImpShare > 0 ? "+" : change.searchImpShare < 0 ? "−" : ""}${Math.abs(change.searchImpShare * 100).toFixed(1)} pts`}
                        </td>
                        <td className={styles[tone(change.convValue)]}>{pct(change.convValue)}</td>
                        <td className={styles[tone(roasDelta(c.mtd, prior))]}>{pct(roasDelta(c.mtd, prior))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          );
        })}
        {!campaigns.length ? <div className={styles.empty}>No campaigns match that filter.</div> : null}
      </section>
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
  return (
    <>
      <td>{money(m.cost)}</td>
      <td>{int.format(m.impressions)}</td>
      <td>{int.format(m.clicks)}</td>
      <td>{m.cost || m.clicks ? money(m.cpc, 2) : "—"}</td>
      <td>{m.searchImpShare == null ? "—" : `${m.searchImpShare.toFixed(1)}%`}</td>
      <td>{money(m.convValue)}</td>
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

function Talk({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.talk}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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

function MixBars({
  rows,
  value,
  max,
  format,
  open,
  onOpen,
}: {
  rows: CampaignReview[];
  value: (c: CampaignReview) => number;
  max: number;
  format: (n: number) => string;
  open: string | null;
  onOpen: (name: string) => void;
}) {
  return (
    <div className={styles.bars}>
      {rows.map((c) => {
        const n = value(c);
        const w = Math.max((n / max) * 100, n > 0 ? 2 : 0);
        return (
          <button
            key={c.name}
            type="button"
            className={`${styles.barRow} ${open === c.name ? styles.barOn : ""}`}
            onClick={() => onOpen(c.name)}
          >
            <span className={styles.barName}>{c.name}</span>
            <span className={styles.barTrack}>
              <span style={{ width: `${w}%` }} />
            </span>
            <span className={styles.barVal}>{format(n)}</span>
          </button>
        );
      })}
    </div>
  );
}
