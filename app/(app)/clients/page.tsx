import Link from "next/link";
import { Suspense } from "react";
import { ClientLogo } from "@/components/ClientLogo";
import { RangeSelect } from "@/components/RangeSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { clientBrand } from "@/lib/brand";
import { getPortfolio } from "@/lib/data";
import { compactRangeLabel, money, normalizeRange, num, ratio } from "@/lib/format";
import { getClientLogoMap } from "@/lib/logos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const data = await getPortfolio(range);
  // Fresh Blob read every request so logo uploads survive refresh.
  const logos = await getClientLogoMap(data.clients.map((c) => c.client.slug));

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Clients</h1>
          <p>
            All mapped Brandastic ad accounts · {compactRangeLabel(range)} ·
            click logo to upload
          </p>
        </div>
        <div className="top-actions">
          <Suspense fallback={null}>
            <RangeSelect value={range} />
          </Suspense>
        </div>
      </div>

      {data.notes?.length ? (
        <div className="notice" style={{ marginBottom: 14 }}>
          {data.notes.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      ) : null}

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
            {data.clients.map((c) => {
              const brand = clientBrand(c.client.slug);
              return (
                <tr key={c.client.id}>
                  <td>
                    <div className="client-row-left">
                      <ClientLogo
                        slug={c.client.slug}
                        name={c.client.name}
                        monogram={brand.monogram}
                        accent={brand.accent}
                        logoUrl={logos[c.client.slug]}
                        size={40}
                      />
                      <div>
                        <div className="client-name">{c.client.name}</div>
                        <div className="client-meta">{c.client.industry}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      status={c.client.status === "setup" ? "missing" : c.source}
                    />
                  </td>
                  <td className="mono">{money(c.combined.spend)}</td>
                  <td className="mono">{num(c.combined.conversions)}</td>
                  <td className="mono">{money(c.combined.cpa)}</td>
                  <td className="mono">{ratio(c.combined.roas)}</td>
                  <td>
                    <Link
                      className="btn primary small"
                      href={`/clients/${c.client.slug}?range=${range}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
