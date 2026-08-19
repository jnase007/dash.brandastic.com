import { Suspense } from "react";
import Link from "next/link";
import { DeepAnalysisControls } from "@/components/DeepAnalysisControls";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { RESULT_GROUPS } from "@/lib/deep-analysis/metrics";
import {
  compactRangeLabel,
  money,
  normalizeRange,
  num,
  ratio,
} from "@/lib/format";
import {
  getLiveDeepAnalysis,
  listLiveDeepAccounts,
  liveDeepStatus,
} from "@/lib/live-deep-analysis";
import { METRIC_COLUMNS, formatMetricCell } from "@/lib/metric-columns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DeepAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    platform?: string;
    accountId?: string;
    resultGroup?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range || "30d");
  const platform = (sp.platform === "google" ? "google" : "meta") as "meta" | "google";
  const resultGroup =
    sp.resultGroup && RESULT_GROUPS[sp.resultGroup] ? sp.resultGroup : "purchases";
  const status = liveDeepStatus();
  const accounts = listLiveDeepAccounts();
  const platformAccounts = accounts.filter((a) => a.platform === platform);
  const accountId = sp.accountId || platformAccounts[0]?.id || "";

  let analysis: Awaited<ReturnType<typeof getLiveDeepAnalysis>> | null = null;
  let analysisError = "";
  if (accountId) {
    try {
      analysis = await getLiveDeepAnalysis({
        platform,
        accountId,
        range,
        resultGroup,
      });
    } catch (e: any) {
      analysisError = e?.message || "Failed to load analysis";
    }
  }

  const t = analysis?.totals;
  const configured = status.configured;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Deep Analysis</h1>
          <p>
            Live Meta + Google connectors · no warehouse ·{" "}
            {compactRangeLabel(range)}
          </p>
        </div>
        <div className="top-actions">
          <StatusBadge
            status={
              !configured
                ? "missing"
                : analysisError
                  ? "error"
                  : analysis
                    ? "connected"
                    : "partial"
            }
          />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      <div className="notice">
        Review-only live pull. Same reusable metric columns as Compare. Daily
        series, campaign split, anomaly flags, and a 7-day projection come from
        Ads Manager / Meta / Google, not a warehouse.
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard
          label="Live stack"
          value={configured ? "Meta + Google" : "Not linked"}
          sub={`Meta ${status.connection.meta} · Google ${status.connection.google}`}
        />
        <MetricCard
          label="Mapped Meta"
          value={num(status.counts.meta_accounts)}
          sub={`${num(status.counts.clients)} clients`}
        />
        <MetricCard
          label="Mapped Google"
          value={num(status.counts.google_customers)}
          sub="Existing dash connectors"
        />
        <MetricCard
          label="Compare"
          value="3 windows"
          sub="Same dates last month and last year"
        />
      </div>

      <Suspense fallback={null}>
        <DeepAnalysisControls
          platform={platform}
          accountId={accountId}
          resultGroup={resultGroup}
          accounts={accounts.map((a) => ({
            platform: a.platform,
            id: a.id,
            name: a.name,
            currency: a.currency,
          }))}
          resultGroups={status.resultGroups}
        />
      </Suspense>

      {analysisError ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Could not load account</h3>
          <p className="muted">{analysisError}</p>
        </div>
      ) : null}

      {!accountId ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>No mapped accounts</h3>
          <p className="muted">
            Add a Meta act_ or Google customer ID on the client roster to analyze
            live data.
          </p>
        </div>
      ) : null}

      {analysis && t ? (
        <>
          <div className="grid metrics" style={{ marginTop: 16, marginBottom: 16 }}>
            {METRIC_COLUMNS.map((col) => (
              <MetricCard
                key={col.key}
                label={col.label}
                value={formatMetricCell(analysis.metrics, col)}
                sub={
                  col.key === "conversions"
                    ? analysis.resultGroupLabel
                    : col.key === "roas"
                      ? `Revenue ${money(t.revenue)}`
                      : undefined
                }
              />
            ))}
          </div>

          <div className="grid two">
            <div className="card">
              <h3>Daily trend</h3>
              <p className="muted" style={{ marginBottom: 10 }}>
                {analysis.account.name} · {analysis.range.since} → {analysis.range.until}
                {t.reachNotAdditive ? " · reach is not additive" : ""}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Spend</th>
                      <th>Clicks</th>
                      <th>Results</th>
                      <th>Revenue</th>
                      <th>CPA</th>
                      <th>ROAS</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.daily.map((d) => (
                      <tr key={d.date}>
                        <td className="mono">{d.date}</td>
                        <td className="mono">{money(d.spend)}</td>
                        <td className="mono">{num(d.clicks)}</td>
                        <td className="mono">{num(d.results)}</td>
                        <td className="mono">{money(d.revenue)}</td>
                        <td className="mono">{money(d.cpa)}</td>
                        <td className="mono">{ratio(d.roas)}</td>
                        <td>{d.anomaly?.flag ? "⚠" : ""}</td>
                      </tr>
                    ))}
                    {!analysis.daily.length ? (
                      <tr>
                        <td colSpan={8} className="muted">
                          No daily rows in this range.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3>Campaigns</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Spend</th>
                    <th>Results</th>
                    <th>CPA</th>
                    <th>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="mono">{money(c.spend)}</td>
                      <td className="mono">{num(c.results)}</td>
                      <td className="mono">{money(c.cpa)}</td>
                      <td className="mono">{ratio(c.roas)}</td>
                    </tr>
                  ))}
                  {!analysis.campaigns.length ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        No campaign rows yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <h3 style={{ marginTop: 20 }}>7-day projection</h3>
              <p className="muted" style={{ marginBottom: 8 }}>
                Spend and results projected separately. CPA = projected spend ÷
                projected results.
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Day +</th>
                    <th>Spend</th>
                    <th>Results</th>
                    <th>CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {(analysis.projection?.spend?.forecast || []).map((s, i) => (
                    <tr key={i}>
                      <td className="mono">+{i + 1}</td>
                      <td className="mono">{money(s)}</td>
                      <td className="mono">{num(analysis.projection.results.forecast[i])}</td>
                      <td className="mono">{money(analysis.projection.cpa[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Notes</h3>
            <ul className="muted" style={{ paddingLeft: 18 }}>
              {(analysis.notes || []).map((n) => (
                <li key={n}>{n}</li>
              ))}
              <li>
                Compare the same dates on the <Link href="/compare">Compare tab</Link>.
              </li>
            </ul>
          </div>
        </>
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Live connectors</h3>
        <p className="muted" style={{ marginBottom: 8 }}>
          Accounts come from the existing client roster, not a warehouse
          discover job.
        </p>
        <p>
          <Link href="/meta">Meta live review</Link>
          {" · "}
          <Link href="/google">Google live review</Link>
          {" · "}
          <Link href="/compare">Compare</Link>
        </p>
      </div>
    </div>
  );
}
