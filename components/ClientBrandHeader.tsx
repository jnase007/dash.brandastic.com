import type { CSSProperties } from "react";
import Link from "next/link";
import { ClientLogo } from "@/components/ClientLogo";
import { clientBrand } from "@/lib/brand";

export function ClientBrandHeader({
  name,
  slug,
  industry,
  rangeLabel,
  crumb = true,
  logoUrl,
}: {
  name: string;
  slug: string;
  industry?: string;
  rangeLabel?: string;
  crumb?: boolean;
  logoUrl?: string | null;
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
      <ClientLogo
        slug={slug}
        name={name}
        monogram={brand.monogram}
        accent={brand.accent}
        logoUrl={logoUrl}
        size={64}
      />
      <div>
        {crumb ? (
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            <Link href="/clients">Clients</Link> / {name}
          </div>
        ) : null}
        <h1>{name}</h1>
        <p>
          {industry || "Client"}
          {rangeLabel ? ` · ${rangeLabel}` : ""} · click logo to upload
        </p>
      </div>
    </div>
  );
}
