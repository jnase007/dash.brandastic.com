"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PROFIT_RANGES,
  burnHealth,
  chartAllocationMinutes,
  chartBuckets,
  clientBySlug,
  contractTrend,
  entriesFor,
  formatEntryDate,
  formatHours,
  formatPct,
  hoursBudget,
  reportWindow,
  contractTermLabel,
  type ProfitabilityData,
  type ProfitRange,
} from "@/lib/profitability";

function profitabilityHref(range: ProfitRange, slug?: string) {
  const query = `?range=${range}`;
  return slug ? `/profitability/${slug}${query}` : `/profitability${query}`;
}

export function ProfitabilityDashboard({
  data,
  view,
  slug = "",
  range: initialRange,
}: {
  data: ProfitabilityData;
  view: "overview" | "client";
  slug?: string;
  range: ProfitRange;
}) {
  const router = useRouter();
  const { clients, entries, bounds } = data;
  const [range, setRange] = useState<ProfitRange>(initialRange);
  const [activeBar, setActiveBar] = useState<string | null>(null);

  useEffect(() => {
    setRange(initialRange);
  }, [initialRange]);

  useEffect(() => {
    setActiveBar(null);
  }, [slug, range]);

  const selected = view === "client" ? clientBySlug(clients, slug) : undefined;
  const period = selected ? reportWindow(selected, range, bounds) : null;
  const periodLabel = period ? `${formatEntryDate(period.start)} – ${formatEntryDate(period.end)}` : "";
  const viewEntries = useMemo(
    () => (selected ? entriesFor(entries, clients, range, selected.slug, bounds) : []),
    [entries, clients, range, selected, bounds]
  );
  const trend = useMemo(
    () => (selected ? contractTrend(entries, clients, selected.slug, bounds.asOf) : null),
    [entries, clients, selected, bounds.asOf]
  );

  function openClient(nextSlug: string) {
    if (!nextSlug) return;
    router.push(profitabilityHref(range, nextSlug));
  }

  function chooseRange(next: ProfitRange) {
    if (next === range) return;
    setRange(next);
    router.replace(view === "client" && slug ? profitabilityHref(next, slug) : profitabilityHref(next), {
      scroll: false,
    });
  }
  const buckets = useMemo(() => chartBuckets(range, viewEntries, bounds), [range, viewEntries, bounds]);
  const cards = useMemo(
    () =>
        clients.map((client) => {
        const ranged = entriesFor(entries, clients, range, client.slug, bounds);
        const loggedRaw = ranged.reduce((sum, entry) => sum + entry.minutes, 0) / 60;
        const logged = Math.round(loggedRaw * 10) / 10;
        const budget = hoursBudget(client, range, bounds);
        const pct = budget ? Math.round((logged / budget) * 1000) / 10 : 0;
        return {
          client,
          logged,
          loggedRaw,
          budget,
          pct,
          health: burnHealth(pct),
          hasBudget: budget != null && budget > 0,
        };
      })
        .sort((a, b) => {
          if (a.hasBudget !== b.hasBudget) return a.hasBudget ? -1 : 1;
          if (b.pct !== a.pct) return b.pct - a.pct;
          return a.client.name.localeCompare(b.client.name);
        }),
    [clients, entries, range, bounds]
  );
  const selectedCard = cards.find((card) => card.client.slug === selected?.slug);
  const budgetLabel = range === "month" ? "Allocated" : range === "quarter" ? "Quarter hrs" : "Contract hrs";
  const portfolioCards = cards.filter((card) => card.client.slug !== "brandastic");
  const totalLogged = portfolioCards.reduce((sum, card) => sum + card.loggedRaw, 0);
  const totalBudget = portfolioCards.reduce(
    (sum, card) => sum + (card.hasBudget && card.budget != null ? card.budget : 0),
    0
  );
  const totalHasBudget = totalBudget > 0;
  const totalPct = totalHasBudget ? (totalLogged / totalBudget) * 100 : 0;
  const totalHealth = burnHealth(totalPct);

  return (
    <div className="pr-page">
      <header className="pr-header">
        <div className="pr-brand">
          <img src="/brand/mark-circle.png" alt="" />
          <div>
            <strong>Agency Health</strong>
            <h1>Client Reports & Profitability</h1>
          </div>
        </div>
        <div className="pr-controls">
          <label className="pr-field">
            <span>Client</span>
            <select value={view === "client" ? slug : ""} onChange={(event) => openClient(event.target.value)}>
              {view === "overview" ? (
                <option value="" disabled>
                  Select a client
                </option>
              ) : null}
              {clients.map((client) => (
                <option key={client.slug} value={client.slug}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <div className="pr-segment" role="group" aria-label="Date range">
            {PROFIT_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={range === item.id ? "active" : ""}
                aria-pressed={range === item.id}
                onClick={() => chooseRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {view === "overview" ? (
      <section className="pr-cards-wrap">
      <article className="pr-card pr-card-total" aria-label="All Clients (minus Brandastic)">
        <div className="pr-card-top">
          <strong>All Clients (minus Brandastic)</strong>
          <span className={`pr-burn ${totalHasBudget ? totalHealth : "warn"}`}>
            {totalHasBudget ? `${formatPct(totalPct)}%` : "No allocation"}
          </span>
        </div>
        <div className="pr-card-hours">
          <span>
            <em>{formatHours(totalLogged)}</em>
            Logged
          </span>
          <span>
            <em>{totalHasBudget ? formatHours(totalBudget) : "—"}</em>
            {budgetLabel}
          </span>
        </div>
        <div className="pr-track" aria-hidden>
          <div
            className={`pr-fill ${totalHasBudget ? totalHealth : "warn"}`}
            style={{ width: `${totalHasBudget ? Math.min(totalPct, 100) : 0}%` }}
          />
        </div>
      </article>
      <div className="pr-cards-sep" role="separator" />
      <div className="pr-cards" aria-label="Client retainer overview">
        {cards.map(({ client, logged, budget, pct, health, hasBudget }) => {
          return (
            <Link
              key={client.slug}
              href={profitabilityHref(range, client.slug)}
              className="pr-card"
            >
              <div className="pr-card-top">
                <strong>{client.name}</strong>
                <span className={`pr-burn ${hasBudget ? health : "warn"}`}>
                  {hasBudget ? `${formatPct(pct)}%` : "No allocation"}
                </span>
              </div>
              <div className="pr-card-hours">
                <span>
                  <em>{formatHours(logged)}</em>
                  Logged
                </span>
                <span>
                  <em>{hasBudget && budget != null ? formatHours(budget) : "—"}</em>
                  {budgetLabel}
                </span>
              </div>
              <div className="pr-track" aria-hidden>
                <div
                  className={`pr-fill ${hasBudget ? health : "warn"}`}
                  style={{ width: `${hasBudget ? Math.min(pct, 100) : 0}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
      </section>
      ) : null}

      {view === "client" && selected && trend ? (
      <section className="pr-dashboard" aria-label="Client report">
        <Link href={profitabilityHref(range)} className="pr-back">
          ← All clients
        </Link>
        <div className="pr-section-label">
          <h2>
            {selected.name}
            {periodLabel ? <span> | {periodLabel}</span> : null}
          </h2>
        </div>

        <div className="pr-kpis">
          <HoursSummary
            logged={selectedCard?.logged ?? 0}
            budget={selectedCard?.hasBudget ? selectedCard.budget : null}
            budgetLabel={budgetLabel}
          />
          <article className="pr-kpi">
            <span>Monthly pace</span>
            <strong>{formatHours(trend.averageHours)} hrs / mo</strong>
            {trend.allocatedHours != null ? (
              <small className={trend.averageHours > trend.allocatedHours ? "over" : "under"}>
                {formatHours(trend.allocatedHours)} allocated / mo
              </small>
            ) : (
              <small>No monthly allocation</small>
            )}
            <em>{selected ? contractTermLabel(selected) : ""}</em>
          </article>
        </div>

        <div className="pr-charts">
          <article className="pr-panel">
            <div className="pr-panel-head">
              <h3>Tracked time</h3>
            </div>
            <BarChart
              buckets={buckets}
              allocationMinutes={chartAllocationMinutes(selected)}
              colorByAllocation
              active={activeBar}
              onActive={setActiveBar}
            />
          </article>
        </div>
      </section>
      ) : null}
    </div>
  );
}

function HoursSummary({
  logged,
  budget,
  budgetLabel,
}: {
  logged: number;
  budget: number | null;
  budgetLabel: string;
}) {
  const pct = budget ? Math.round((logged / budget) * 1000) / 10 : 0;
  const health = burnHealth(pct);
  return (
    <article className="pr-kpi pr-kpi-burn">
      <div className="pr-card-top">
        <span>Total hours</span>
        <span className={`pr-burn ${budget ? health : "warn"}`}>{budget ? `${formatPct(pct)}%` : "No allocation"}</span>
      </div>
      <div className="pr-card-hours">
        <span>
          <em>{formatHours(logged)}</em>
          Logged
        </span>
        <span>
          <em>{budget != null ? formatHours(budget) : "—"}</em>
          {budgetLabel}
        </span>
      </div>
      <div className="pr-track" aria-hidden>
        <div className={`pr-fill ${budget ? health : "warn"}`} style={{ width: `${budget ? Math.min(pct, 100) : 0}%` }} />
      </div>
    </article>
  );
}

function BarChart({
  buckets,
  allocationMinutes,
  colorByAllocation,
  active,
  onActive,
}: {
  buckets: { key: string; label: string; minutes: number }[];
  allocationMinutes: number | null;
  colorByAllocation: boolean;
  active: string | null;
  onActive: (key: string | null) => void;
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.minutes), 1);
  const hasLine = allocationMinutes != null && allocationMinutes > 0;
  const ceiling = Math.max(max, hasLine ? allocationMinutes : 0);
  return (
    <div className="pr-bars">
      {hasLine ? (
        <span
          className="pr-allocation-line"
          style={{ bottom: `calc(24px + (100% - 46px) * ${allocationMinutes / ceiling})` }}
        />
      ) : null}
      {buckets.map((bucket) => {
        const within = hasLine ? Math.min(bucket.minutes, allocationMinutes) : bucket.minutes;
        const over = hasLine ? Math.max(0, bucket.minutes - allocationMinutes) : 0;
        const height = `${(bucket.minutes / ceiling) * 100}%`;
        return (
          <button
            key={bucket.key}
            type="button"
            className={`pr-bar ${active === bucket.key ? "active" : ""}`}
            onMouseEnter={() => onActive(bucket.key)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(bucket.key)}
            onBlur={() => onActive(null)}
          >
            <span className="pr-bar-stack">
              {colorByAllocation && hasLine ? (
                <span className="pr-bar-col" style={{ height }}>
                  <span className="pr-bar-value">{formatHours(bucket.minutes / 60)}h</span>
                  {over > 0 ? <span className="pr-bar-over" style={{ flexGrow: over }} /> : null}
                  {within > 0 ? (
                    <span className={`pr-bar-within ${over > 0 ? "split" : "solo"}`} style={{ flexGrow: within }} />
                  ) : null}
                </span>
              ) : (
                <span className="bill" style={{ height }}>
                  <span className="pr-bar-value">{formatHours(bucket.minutes / 60)}h</span>
                </span>
              )}
            </span>
            <span className="pr-bar-label">{bucket.label}</span>
            {active === bucket.key ? (
              <span className="pr-tip" role="tooltip">
                <strong>{bucket.label}</strong>
                {formatHours(bucket.minutes / 60)}h tracked
                {hasLine ? (
                  <>
                    <br />
                    {formatHours(allocationMinutes / 60)}h allocated
                  </>
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
