import { Suspense } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getPortfolio } from "@/lib/data";
import { listMetaAdAccounts, metaConfigured } from "@/lib/meta";
import { compactRangeLabel, money, normalizeRange, num } from "@/lib/format";

export default async function MetaPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getPortfolio(range);

  let accounts: any[] = [];
  let accountError = "";
  if (metaConfigured()) {
    try {
      accounts = await listMetaAdAccounts();
    } catch (e: any) {
      accountError = e.message || "Could not list Meta ad accounts";
    }
  }

  const metaTotals = data.clients.reduce(
    (acc, c) => {
      if (!c.meta) return acc;
      return {
        spend: acc.spend + c.meta.spend,
        clicks: acc.clicks + c.meta.clicks,
        conversions: acc.conversions + c.meta.conversions,
      };
    },
    { spend: 0, clicks: 0, conversions: 0 }
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Meta Ads</h1>
          <p>Read-only Marketing API review · {compactRangeLabel(range)}</p>
        </div>
        <div className="top-actions">
          <StatusBadge status={data.connection.meta} />
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      <div className="notice">
        Meta access is <strong>review only</strong>. This page never creates,
        edits, pauses, or publishes ads/campaigns/budgets.
      </div>

      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Meta spend" value={money(metaTotals.spend)} />
        <MetricCard label="Meta clicks" value={num(metaTotals.clicks)} />
        <MetricCard label="Meta conversions" value={num(metaTotals.conversions)} />
        <MetricCard
          label="Mapped clients"
          value={String(data.clients.filter((c) => c.meta).length)}
        />
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Client Meta rollup</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Spend</th>
                <th>Conv.</th>
                <th>CPA</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <tr key={c.client.id}>
                  <td>{c.client.name}</td>
                  <td className="mono">{money(c.meta?.spend)}</td>
                  <td className="mono">{num(c.meta?.conversions)}</td>
                  <td className="mono">{money(c.meta?.cpa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Token-visible ad accounts</h3>
          {!metaConfigured() ? (
            <p className="muted">
              Set <code>META_ACCESS_TOKEN</code> in Vercel env to list live ad
              accounts from Jonathan's token.
            </p>
          ) : accountError ? (
            <p className="muted">{accountError}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="mono">{a.account_id || a.id}</td>
                    <td>{a.account_status}</td>
                  </tr>
                ))}
                {!accounts.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No ad accounts returned for this token.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
