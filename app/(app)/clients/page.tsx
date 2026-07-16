import Link from "next/link";
import { Suspense } from "react";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel, money, num, ratio } from "@/lib/format";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range || "30d";
  const data = await getPortfolio(range);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Clients</h1>
          <p>All mapped Brandastic ad accounts · {compactRangeLabel(range)}</p>
        </div>
        <div className="top-actions">
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>Spend</th>
              <th>Conv.</th>
              <th>CPA</th>
              <th>ROAS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((c) => (
              <tr key={c.client.id}>
                <td>
                  <div className="client-name">{c.client.name}</div>
                  <div className="client-meta">{c.client.industry}</div>
                </td>
                <td>
                  <StatusBadge status={c.client.status === "setup" ? "missing" : c.source} />
                </td>
                <td className="mono">{money(c.combined.spend)}</td>
                <td className="mono">{num(c.combined.conversions)}</td>
                <td className="mono">{money(c.combined.cpa)}</td>
                <td className="mono">{ratio(c.combined.roas)}</td>
                <td>
                  <Link className="btn ghost" href={`/clients/${c.client.slug}?range=${range}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
