import { Suspense } from "react";
import Link from "next/link";
import { DeepAnalysisControls } from "@/components/DeepAnalysisControls";
import { DeepAnalysisVisuals } from "@/components/DeepAnalysisVisuals";
import { KpiSparkChart } from "@/components/analysis/KpiSparkChart";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { DEFAULT_RESULT_KEY, deltaTone, normalizeResultKey } from "@/lib/deep-analysis/catalog";
import { TABLE_KEYS, campaignDetailHref, formatCatalogValue, formatDeltaArrow } from "@/lib/deep-analysis/board";
import {
  getClientAnalysis,
  listAnalysisClients,
  liveDeepStatus,
} from "@/lib/deep-analysis/load";
import { clientHasGoogle, clientHasMeta } from "@/lib/clients";
import { compactRangeLabel, normalizeRange } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DeepAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    slug?: string;
    channel?: string;
    resultGroup?: string;
    platform?: string;
    accountId?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range || "30d");
  const resultGroup = normalizeResultKey(sp.resultGroup) || DEFAULT_RESULT_KEY;
  const status = liveDeepStatus();
  const clients = listAnalysisClients();
  const slug = sp.slug || clients[0]?.slug || "";
  const requested = (sp.channel || "").toLowerCase();
  const channel =
    requested === "meta" || requested === "google" || requested === "combined"
      ? requested
      : undefined;

  let analysis: Awaited<ReturnType<typeof getClientAnalysis>> | null = null;
  let analysisError = "";
  if (slug) {
    try {
      analysis = await getClientAnalysis({
        slug,
        range,
        channel,
        resultGroup,
        platform: sp.platform === "google" || sp.platform === "meta" ? sp.platform : undefined,
        accountId: sp.accountId,
      });
    } catch (e: any) {
      analysisError = e?.message || "Failed to load analysis";
    }
  }

  const configured = status.configured;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Deep Analysis</h1>
          <p>
            Live Meta + Google · campaign × day · {compactRangeLabel(range)}
          </p>
        </div>
        <div className="top-actions">
          <Link href="/chart-lab" className="text-sm font-medium text-blue-600 hover:underline">
            Chart lab (temp)
          </Link>
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
        Review-only. Ratios from period sums. Hide paused is not used here.
        Status is new / gone / active from spend in each window.
      </div>

      <Suspense fallback={null}>
        <DeepAnalysisControls
          slug={analysis?.client.slug || slug}
          channel={analysis?.channel || "combined"}
          resultGroup={analysis?.resultGroup || resultGroup}
          clients={clients.map((c) => ({
            slug: c.slug,
            name: c.name,
            hasMeta: clientHasMeta(c),
            hasGoogle: clientHasGoogle(c),
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

      {analysis ? (
        <>
          <p className="muted" style={{ margin: "12px 0 8px", fontSize: 13 }}>
            Analyzing {analysis.current.since} – {analysis.current.until} ·
            comparing with {analysis.previous.since} – {analysis.previous.until}{" "}
            · data complete through {analysis.current.until}
          </p>

          <div className="grid metrics" style={{ marginBottom: 16 }}>
            {analysis.kpi.tiles.map((tile) => {
              const tone = deltaTone(tile.key, tile.delta);
              return (
                <div key={tile.key} className="card metric-card premium">
                  <div className="metric-card-top">
                    <div className="metric-label">{tile.label}</div>
                    <span className={`delta-pill ${tone === "good" ? "good" : tone === "bad" ? "bad" : "flat"}`}>
                      {formatDeltaArrow(tile.delta)}
                    </span>
                  </div>
                  <div className="metric-value mono">
                    {formatCatalogValue(tile.key, tile.value)}
                  </div>
                  <div className="metric-sub">
                    prev {formatCatalogValue(tile.key, tile.previous)}
                    {tile.target
                      ? ` · target ${formatCatalogValue("cost_per_result", tile.target.value)} (${tile.target.pct}%)`
                      : ""}
                  </div>
                  <KpiSparkChart
                    metricKey={tile.key}
                    label={tile.label}
                    unit={tile.unit}
                    points={tile.sparkPoints}
                  />
                </div>
              );
            })}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Campaigns</h3>
            <p className="muted" style={{ marginBottom: 10 }}>
              Current vs previous window. Reach / frequency are Meta only and
              null on the total row. Open a campaign for ads. Ads stay off this load.
            </p>
            <div className="table-scroll">
              <table className="table clients-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    {TABLE_KEYS.map((key) => (
                      <th key={key}>{key.replace(/_/g, " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.campaigns.map((c) => (
                    <tr key={c.id} className="row-clickable">
                      <td>
                        <Link
                          href={campaignDetailHref({
                            slug: analysis.client.slug,
                            campaignId: c.campaignId,
                            range,
                            channel: c.channel,
                            accountId: c.accountId,
                          })}
                          className="campaign-link"
                        >
                          {c.name}
                        </Link>{" "}
                        <span className="badge sm">{c.channel}</span>
                      </td>
                      <td>
                        <span className="badge sm">{c.status}</span>
                      </td>
                      {TABLE_KEYS.map((key) => (
                        <td key={key} className="mono">
                          {formatCatalogValue(key, c.current.derived[key])}
                          <div className="muted" style={{ fontSize: 11 }}>
                            {formatDeltaArrow(c.delta[key] ?? null)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}>Total</td>
                    {TABLE_KEYS.map((key) => (
                      <td key={key} className="mono">
                        {key === "reach" || key === "frequency"
                          ? "—"
                          : formatCatalogValue(key, analysis.campaignTotal.derived[key])}
                      </td>
                    ))}
                  </tr>
                  {!analysis.campaigns.length ? (
                    <tr>
                      <td colSpan={2 + TABLE_KEYS.length} className="muted">
                        No campaign rows in these windows.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <DeepAnalysisVisuals
            costLabel={analysis.costLabel}
            targetCpa={analysis.client.targetCpa}
            daily={analysis.kpi.daily.map((d) => ({
              date: d.date,
              spend: d.sums.spend,
              results: d.sums.results,
              impressions: d.sums.impressions,
              clicks: d.sums.clicks,
              cost: d.derived.cost_per_result,
              ctr: d.derived.ctr,
              cpc: d.derived.cpc,
              cpm: d.derived.cpm,
              conv_rate: d.derived.conv_rate,
            }))}
            diagnosis={analysis.diagnosis}
            efficiency={analysis.efficiency}
            curve={analysis.curve}
            campaigns={analysis.campaigns.map((c) => ({
              id: c.id,
              name: c.name,
              channel: c.channel,
              status: c.status,
              spend0: c.previous.sums.spend,
              spend1: c.current.sums.spend,
              results0: c.previous.sums.results,
              results1: c.current.sums.results,
              cost0: c.previous.derived.cost_per_result,
              cost1: c.current.derived.cost_per_result,
              clicks0: c.previous.sums.clicks,
              clicks1: c.current.sums.clicks,
            }))}
          />

          <div className="card" style={{ marginBottom: 16 }}>
              <h3>Who drove it</h3>
              {!analysis.movers.ok ? (
                <p className="muted">{analysis.movers.reason}</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Spend</th>
                      <th>Results</th>
                      <th>Cost</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.movers.rows.map((m) => (
                      <tr key={m.id} className="row-clickable">
                        <td>
                          <Link
                            href={campaignDetailHref({
                              slug: analysis.client.slug,
                              campaignId: m.campaignId,
                              range,
                              channel: m.channel,
                              accountId: m.accountId,
                            })}
                            className="campaign-link"
                          >
                            {m.name}
                          </Link>{" "}
                          <span className="badge sm">{m.channel}</span>
                        </td>
                        <td><span className="badge sm">{m.status}</span></td>
                        <td className="mono">
                          {formatCatalogValue("spend", m.spend1)}
                          <div className="muted" style={{ fontSize: 11 }}>
                            prev {formatCatalogValue("spend", m.spend0)}
                          </div>
                        </td>
                        <td className="mono">
                          {m.results1}
                          <div className="muted" style={{ fontSize: 11 }}>prev {m.results0}</div>
                        </td>
                        <td className="mono">
                          {formatCatalogValue("cost_per_result", m.cost1)}
                          <div className="muted" style={{ fontSize: 11 }}>
                            prev {formatCatalogValue("cost_per_result", m.cost0)}
                          </div>
                        </td>
                        <td className="mono">{m.impact == null ? "—" : m.impact.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          <div className="card">
            <h3>Notes</h3>
            <ul className="muted" style={{ paddingLeft: 18 }}>
              {analysis.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
              <li>
                Period comparison uses the adjacent previous window for the
                selected range.
              </li>
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
