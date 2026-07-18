import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientBrandHeader } from "@/components/ClientBrandHeader";
import { InsightList } from "@/components/InsightList";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getClient } from "@/lib/clients";
import { getClientSummary } from "@/lib/data";
import {
  compactRangeLabel,
  money,
  normalizeRange,
  num,
  pct,
  ratio,
} from "@/lib/format";
import { buildClientInsights } from "@/lib/insights";
import type { MetricSet } from "@/lib/types";

const CHANNELS = {
  meta: {
    key: "meta" as const,
    label: "Meta Ads",
    short: "Meta",
    badge: "meta",
  },
  google: {
    key: "google" as const,
    label: "Google Ads",
    short: "Google",
    badge: "google",
  },
};

function emptyMetrics(): MetricSet {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: null,
    cpa: null,
    roas: null,
  };
}

export default async function ClientChannelReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; channel: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug, channel: rawChannel } = await params;
  const channelKey = rawChannel.toLowerCase();
  const channel = CHANNELS[channelKey as keyof typeof CHANNELS];
  if (!channel) notFound();
  if (!getClient(slug)) notFound();

  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getClientSummary(slug, range);
  const metrics = (channel.key === "meta" ? data.meta : data.google) || emptyMetrics();
  const campaigns = data.campaigns.filter((c) => c.platform === channel.key);
  const mapped =
    channel.key === "meta"
      ? Boolean(data.client.metaAccountId)
      : Boolean(data.client.googleCustomerId);
  const live = channel.key === "meta" ? Boolean(data.meta) : Boolean(data.google);
  const insights = buildClientInsights(data).filter(
    (i) => !i.platform || i.platform === channel.key || i.platform === "combined"
  );

  const status = !mapped ? "missing" : live ? data.source : "partial";
  const top = [...campaigns].sort((a, b) => b.metrics.spend - a.metrics.spend).slice(0, 8);

  return (
    <div>
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/reports/${slug}?range=${encodeURIComponent(range)}`} className="back-link">
            ← Back to blended report
          </Link>
          <div style={{ marginTop: 10 }}>
            <ClientBrandHeader
              name={`${data.client.name} · ${channel.label}`}
              slug={data.client.slug}
              industry={data.client.industry}
              rangeLabel={compactRangeLabel(range)}
            />
          </div>
        </div>
        <div className="top-actions">
          <StatusBadge status={status} />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
          <Link className="btn ghost" href={`/clients/${slug}?range=${encodeURIComponent(range)}`}>
            Dashboard
          </Link>
        </div>
      </div>

      <div className="report-channel-tabs">
        <Link
          href={`/reports/${slug}?range=${encodeURIComponent(range)}`}
          className="report-channel-tab"
        >
          Blended
        </Link>
        <Link
          href={`/reports/${slug}/meta?range=${encodeURIComponent(range)}`}
          className={`report-channel-tab ${channel.key === "meta" ? "active" : ""}`}
        >
          Meta Ads
        </Link>
        <Link
          href={`/reports/${slug}/google?range=${encodeURIComponent(range)}`}
          className={`report-channel-tab ${channel.key === "google" ? "active" : ""}`}
        >
          Google Ads
        </Link>
      </div>

      <div className="notice">
        <strong>{channel.label} channel report.</strong>{" "}
        {!mapped
          ? `${channel.short} account ID is not mapped for ${data.client.name} yet.`
          : !live
            ? `${channel.short} is mapped, but no live metrics came back for this range.`
            : `Live ${channel.short} performance only — not blended with the other channel.`}
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Spend" value={money(metrics.spend)} sub={`${channel.short} only`} />
        <MetricCard
          label="Clicks"
          value={num(metrics.clicks)}
          sub={`CTR ${pct(metrics.ctr)} · Impr. ${num(metrics.impressions)}`}
        />
        <MetricCard
          label="Conversions"
          value={num(metrics.conversions)}
          sub={`CPA ${money(metrics.cpa)}`}
        />
        <MetricCard label="ROAS" value={ratio(metrics.roas)} sub={`${channel.short} attributed`} />
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>{channel.short} snapshot</h3>
          <div className="channel-stat-list">
            <div>
              <span>Account mapped</span>
              <strong>{mapped ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Live metrics</span>
              <strong>{live ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Campaigns in range</span>
              <strong>{num(campaigns.length)}</strong>
            </div>
            <div>
              <span>Avg CPC</span>
              <strong>{money(metrics.cpc)}</strong>
            </div>
          </div>
          {data.notes?.length ? (
            <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>
              {data.notes.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="card">
          <h3>Channel recommendations</h3>
          {insights.length ? (
            <InsightList insights={insights.slice(0, 6)} />
          ) : (
            <p className="muted">No channel-specific recommendations for this range.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head-row">
          <div>
            <h3>{channel.short} campaigns</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Sorted by spend · {compactRangeLabel(range)}
            </p>
          </div>
          <span className="badge muted">{campaigns.length}</span>
        </div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Spend</th>
              <th>Clicks</th>
              <th>Conv.</th>
              <th>CPA</th>
              <th>ROAS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr key={`${c.platform}-${c.id}`}>
                <td>
                  <div className="client-name">{c.name}</div>
                  {c.objective ? <div className="client-meta">{c.objective}</div> : null}
                </td>
                <td>{c.status}</td>
                <td className="mono">{money(c.metrics.spend)}</td>
                <td className="mono">{num(c.metrics.clicks)}</td>
                <td className="mono">{num(c.metrics.conversions)}</td>
                <td className="mono">{money(c.metrics.cpa)}</td>
                <td className="mono">{ratio(c.metrics.roas)}</td>
                <td>
                  {channel.key === "meta" ? (
                    <Link
                      className="btn primary small"
                      href={`/clients/${slug}/campaigns/${c.id}?range=${encodeURIComponent(range)}&platform=meta`}
                    >
                      Open ads
                    </Link>
                  ) : (
                    <span className="badge muted">Google</span>
                  )}
                </td>
              </tr>
            ))}
            {!top.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  No {channel.short} campaigns in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="pill-row">
        <Link className="btn ghost" href={`/reports/${slug}?range=${encodeURIComponent(range)}`}>
          Blended report
        </Link>
        <Link
          className="btn ghost"
          href={`/reports/${slug}/${channel.key === "meta" ? "google" : "meta"}?range=${encodeURIComponent(range)}`}
        >
          Switch to {channel.key === "meta" ? "Google" : "Meta"}
        </Link>
        <Link className="btn primary" href={`/clients/${slug}?range=${encodeURIComponent(range)}`}>
          Open client dashboard
        </Link>
      </div>
    </div>
  );
}
