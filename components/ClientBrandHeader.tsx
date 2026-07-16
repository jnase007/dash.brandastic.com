import type { CSSProperties } from "react";
import Link from "next/link";
import { clientBrand } from "@/lib/brand";

export function ClientBrandHeader({
  name,
  slug,
  industry,
  rangeLabel,
  crumb = true,
}: {
  name: string;
  slug: string;
  industry?: string;
  rangeLabel?: string;
  crumb?: boolean;
}) {
  const brand = clientBrand(slug);

  return (
    <div
      className="client-brand-banner"
      style={
        {
          "--client-accent": brand.accent,
          "--client-accent-soft": brand.accentSoft,
        } as CSSProperties
      }
    >
      <div className="client-brand-mark">{brand.monogram}</div>
      <div>
        {crumb ? (
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            <Link href="/clients">Clients</Link> / {name}
          </div>
        ) : null}
        <h1>{name}</h1>
        <p>
          {industry || "Client"}
          {rangeLabel ? ` · ${rangeLabel}` : ""} · branded review view
        </p>
      </div>
    </div>
  );
}
