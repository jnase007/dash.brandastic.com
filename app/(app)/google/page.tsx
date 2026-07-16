import { Suspense } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getPortfolio } from "@/lib/data";
import { googleConfigured } from "@/lib/google-ads";
import { compactRangeLabel, money, normalizeRange, num } from "@/lib/format";

export default async function GooglePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getPortfolio(range);

  const totals = data.clients.reduce(
    (acc, c) => {
      if (!c.google) return acc;
      return {
        spend: acc.spend + c.google.spend,
        clicks: acc.clicks + c.google.clicks,
        conversions: acc.conversions + c.google.conversions,
      };
    },
    { spend: 0, clicks: 0, conversions: 0 }
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Google Ads</h1>
          <p>Read-only campaign metrics · {compactRangeLabel(range)}</p>
        </div>
        <div className="top-actions">
          <StatusBadge status={data.connection.google} />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      <div className="notice">
        Google Ads connector is read-only via API searchStream. No mutate calls
        are implemented.
        {!googleConfigured()
          ? " Add developer token + OAuth refresh credentials to go live."
          : ""}
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Google spend" value={money(totals.spend)} />
        <MetricCard label="Google clicks" value={num(totals.clicks)} />
        <MetricCard label="Google conversions" value={num(totals.conversions)} />
        <MetricCard
          label="Mapped clients"
          value={String(data.clients.filter((c) => c.google).length)}
        />
      </div>

      <div className="card">
        <h3>Client Google rollup</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Customer ID</th>
              <th>Spend</th>
              <th>Conv.</th>
              <th>CPA</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((c) => (
              <tr key={c.client.id}>
                <td>{c.client.name}</td>
                <td className="mono">{c.client.googleCustomerId || "—"}</td>
                <td className="mono">{money(c.google?.spend)}</td>
                <td className="mono">{num(c.google?.conversions)}</td>
                <td className="mono">{money(c.google?.cpa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
