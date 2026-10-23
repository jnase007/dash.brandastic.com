"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PROFIT_RANGES,
  burnHealth,
  chartAllocationMinutes,
  chartBuckets,
  clientBySlug,
  contractTrend,
  donutSlices,
  entriesFor,
  formatDuration,
  formatEntryDate,
  formatHours,
  formatPct,
  hoursBudget,
  reportWindow,
  contractTermLabel,
  type ProfitabilityData,
  type ProfitRange,
  type TimeEntry,
} from "@/lib/profitability";

const PAGE_SIZE = 8;

export function ProfitabilityDashboard({ data }: { data: ProfitabilityData }) {
  const { clients, entries, bounds, coverage } = data;
  const [range, setRange] = useState<ProfitRange>("month");
  const [clientSlug, setClientSlug] = useState(clients[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [activeSlice, setActiveSlice] = useState<string | null>(null);
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const [showAllCards, setShowAllCards] = useState(false);
  const [cardColumns, setCardColumns] = useState(4);

  useEffect(() => {
    setPage(1);
  }, [query, clientSlug, range]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1281px)");
    const apply = () => setCardColumns(wide.matches ? 4 : 2);
    apply();
    wide.addEventListener("change", apply);
    return () => wide.removeEventListener("change", apply);
  }, []);

  const selected = clientBySlug(clients, clientSlug) || clients[0];
  const selectedName = selected?.name || "";
  const period = selected ? reportWindow(selected, range, bounds) : null;
  const periodLabel = period ? `${formatEntryDate(period.start)} – ${formatEntryDate(period.end)}` : "";
  const viewEntries = useMemo(
    () => entriesFor(entries, clients, range, clientSlug, bounds),
    [entries, clients, range, clientSlug, bounds]
  );
  const trend = useMemo(
    () => contractTrend(entries, clients, clientSlug, bounds.asOf),
    [entries, clients, clientSlug, bounds.asOf]
  );
  const buckets = useMemo(() => chartBuckets(range, viewEntries, bounds), [range, viewEntries, bounds]);
  const slices = useMemo(() => donutSlices(viewEntries, clients, clientSlug), [viewEntries, clients, clientSlug]);
  const cards = useMemo(
    () =>
        clients.map((client) => {
        const ranged = entriesFor(entries, clients, range, client.slug, bounds);
        const loggedRaw = ranged.reduce((sum, entry) => sum + entry.minutes, 0) / 60;
        const logged = Math.round(loggedRaw * 10) / 10;
        const budget = hoursBudget(client, range, bounds);
        const pct = budget ? Math.round((logged / budget) * 1000) / 10 : 0;
        return { client, logged, budget, pct, health: burnHealth(pct), hasBudget: budget != null && budget > 0 };
      })
        .sort((a, b) => {
          if (a.hasBudget !== b.hasBudget) return a.hasBudget ? -1 : 1;
          if (b.pct !== a.pct) return b.pct - a.pct;
          return a.client.name.localeCompare(b.client.name);
        }),
    [clients, entries, range, bounds]
  );
  const visibleCards = showAllCards ? cards : cards.slice(0, cardColumns);
  const hiddenCardCount = cards.length - visibleCards.length;
  const selectedCard = cards.find((card) => card.client.slug === selected?.slug);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = [...viewEntries].sort((a, b) => b.date.localeCompare(a.date) || a.member.localeCompare(b.member));
    if (!needle) return rows;
    return rows.filter((entry) => {
      const client = clientBySlug(clients, entry.clientSlug)?.name || "";
      return [formatEntryDate(entry.date), entry.member, entry.task, entry.taskId, entry.description, client]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, viewEntries, clients]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
            <select value={clientSlug} onChange={(event) => setClientSlug(event.target.value)}>
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
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <p className="pr-note">
        Logged hours are Tempo worklogs through {bounds.asOf}, summed the same way as the retainer report. This Month
        compares those hours with the monthly allocation from Brand Care Clients. This Quarter is the calendar quarter
        through today, using that allocation for each month already underway. Contract Year uses column C: from
        365 days before the renewal date through today, or through that date if it has already passed. MTM shows the
        last 12 months, including this month. All tracked time is billable.
      </p>
      <ul className="pr-gaps">
        <li>
          Clients are the Jira project ids on the Brand Care Clients sheet. Tempo does not store the monthly hour
          budget.
        </li>
        <li>Billing rates are $0, so revenue, profit, and margin are not available.</li>
        <li>Task names and Jira issue keys are not in Tempo. The table shows the numeric issue id.</li>
        <li>Team labels are Tempo role names, not full Jira profiles.</li>
        <li>
          {coverage.describedCount} of {coverage.entryCount} entries have a worklog description.
        </li>
      </ul>

      <section className="pr-cards-wrap">
      <div className="pr-cards" aria-label="Client retainer overview">
        {visibleCards.map(({ client, logged, budget, pct, health, hasBudget }) => {
          const selected = client.slug === clientSlug;
          return (
            <button
              key={client.slug}
              type="button"
              className={`pr-card ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => setClientSlug(client.slug)}
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
                  {range === "month" ? "Allocated" : range === "quarter" ? "Quarter hrs" : "Contract hrs"}
                </span>
              </div>
              <div className="pr-track" aria-hidden>
                <div
                  className={`pr-fill ${hasBudget ? health : "warn"}`}
                  style={{ width: `${hasBudget ? Math.min(pct, 100) : 0}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
        {hiddenCardCount > 0 || showAllCards ? (
          <button
            type="button"
            className="pr-more"
            aria-expanded={showAllCards}
            onClick={() => setShowAllCards((open) => !open)}
          >
            {showAllCards ? "Show less" : `Show more (${hiddenCardCount})`}
          </button>
        ) : null}
      </section>

      <section className="pr-dashboard" aria-label="Client report">
        <div className="pr-section-label">
          <h2>
            {selectedName}
            {periodLabel ? <span> | {periodLabel}</span> : null}
          </h2>
        </div>

        <div className="pr-kpis">
          <HoursSummary
            logged={selectedCard?.logged ?? 0}
            budget={selectedCard?.hasBudget ? selectedCard.budget : null}
            budgetLabel={range === "month" ? "Allocated" : range === "quarter" ? "Quarter hrs" : "Contract hrs"}
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
          <article className="pr-panel">
            <div className="pr-panel-head">
              <h3>Time by team member</h3>
            </div>
            <DonutChart slices={slices} active={activeSlice} onActive={setActiveSlice} />
          </article>
        </div>

        <article className="pr-panel">
          <div className="pr-panel-head">
            <h3>Time entries</h3>
            <label className="pr-search">
              <span className="sr-only">Search entries</span>
              <input
                type="search"
                value={query}
                placeholder="Search member, task, or description"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team Member</th>
                  <th>Task / Work ID</th>
                  <th>Description</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length ? (
                  pageRows.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="pr-empty">
                      No entries match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pr-pager">
            <span>
              {filteredEntries.length
                ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredEntries.length)} of ${filteredEntries.length}`
                : "0 entries"}
            </span>
            <div>
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </button>
              <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                Next
              </button>
            </div>
          </div>
        </article>
      </section>
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

function EntryRow({ entry }: { entry: TimeEntry }) {
  return (
    <tr>
      <td>{formatEntryDate(entry.date)}</td>
      <td>{entry.member}</td>
      <td>
        <span className="pr-task">
          {entry.task}
          <code>{entry.taskId}</code>
        </span>
      </td>
      <td>{entry.description}</td>
      <td className="pr-duration">{formatDuration(entry.minutes)}</td>
    </tr>
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
                {formatHours(bucket.minutes / 60)}h
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

function DonutChart({
  slices,
  active,
  onActive,
}: {
  slices: { label: string; minutes: number; color: string }[];
  active: string | null;
  onActive: (label: string | null) => void;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.minutes, 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  const activeSlice = slices.find((slice) => slice.label === active);

  return (
    <div className="pr-donut-wrap">
      <div className="pr-donut">
        <svg viewBox="0 0 200 200" role="img" aria-label="Time distribution">
          <g transform="rotate(-90 100 100)">
            {slices.map((slice) => {
              const length = total ? (slice.minutes / total) * circumference : 0;
              const gap = length > 6 ? 2 : 0;
              const visible = Math.max(length - gap, 0);
              const dash = `${visible} ${circumference - visible}`;
              const offset = -cursor;
              cursor += length;
              return (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="26"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  opacity={!active || active === slice.label ? 1 : 0.35}
                  onMouseEnter={() => onActive(slice.label)}
                  onMouseLeave={() => onActive(null)}
                />
              );
            })}
          </g>
          <text x="100" y="96" textAnchor="middle" className="pr-donut-value">
            {formatHours(total / 60)}h
          </text>
          <text x="100" y="116" textAnchor="middle" className="pr-donut-sub">
            logged
          </text>
        </svg>
        {activeSlice ? (
          <div className="pr-tip floating" role="tooltip">
            <strong>{activeSlice.label}</strong>
            {((activeSlice.minutes / total) * 100).toFixed(1)}% · {formatDuration(activeSlice.minutes)}
          </div>
        ) : null}
      </div>
      <ul className="pr-donut-legend">
        {slices.map((slice) => {
          const pct = total ? (slice.minutes / total) * 100 : 0;
          return (
            <li key={slice.label}>
              <button
                type="button"
                className={active === slice.label ? "active" : ""}
                onMouseEnter={() => onActive(slice.label)}
                onMouseLeave={() => onActive(null)}
                onFocus={() => onActive(slice.label)}
                onBlur={() => onActive(null)}
              >
                <i style={{ background: slice.color }} />
                <span>{slice.label}</span>
                <em>
                  {pct.toFixed(1)}% · {formatDuration(slice.minutes)}
                </em>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
