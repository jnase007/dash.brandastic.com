"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdPreviewCard } from "@/components/AdPreviewCard";
import { money, num, pct } from "@/lib/format";
import type { AdCreativeRow } from "@/lib/types";

type SortKey = "spend" | "clicks" | "ctr" | "conversions" | "cpa";
type TypeFilter = "all" | "video" | "image" | "search";

function isVideo(ad: AdCreativeRow) {
  return ad.assets.some((a) => a.videoUrl || a.type === "video");
}
function isImage(ad: AdCreativeRow) {
  return (
    !isVideo(ad) &&
    ad.assets.some((a) => a.type === "image" || a.url || a.thumbnailUrl)
  );
}
function isSearch(ad: AdCreativeRow) {
  return !isVideo(ad) && !isImage(ad);
}

export function AdReviewFilters({
  ads,
  selectedId,
  baseQs,
  clientSlug,
  clientName,
  logoUrl,
}: {
  ads: AdCreativeRow[];
  selectedId: string;
  baseQs: string;
  clientSlug: string;
  clientName: string;
  logoUrl?: string | null;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("spend");
  const [status, setStatus] = useState<"all" | "active" | "other">("all");

  const filtered = useMemo(() => {
    let rows = [...ads];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter(
        (a) =>
          a.name.toLowerCase().includes(needle) ||
          (a.headline || "").toLowerCase().includes(needle) ||
          (a.primaryText || "").toLowerCase().includes(needle)
      );
    }
    if (type === "video") rows = rows.filter(isVideo);
    if (type === "image") rows = rows.filter(isImage);
    if (type === "search") rows = rows.filter(isSearch);
    if (status === "active") {
      rows = rows.filter((a) => /active|enabled/i.test(a.status));
    }
    if (status === "other") {
      rows = rows.filter((a) => !/active|enabled/i.test(a.status));
    }

    rows.sort((a, b) => {
      if (sort === "spend") return b.metrics.spend - a.metrics.spend;
      if (sort === "clicks") return b.metrics.clicks - a.metrics.clicks;
      if (sort === "ctr") return b.metrics.ctr - a.metrics.ctr;
      if (sort === "conversions") {
        return b.metrics.conversions - a.metrics.conversions;
      }
      const ac = a.metrics.cpa;
      const bc = b.metrics.cpa;
      if (ac == null && bc == null) return 0;
      if (ac == null) return 1;
      if (bc == null) return -1;
      return bc - ac; // higher CPA first
    });
    return rows;
  }, [ads, q, type, sort, status]);

  const selected =
    filtered.find((a) => a.id === selectedId) ||
    filtered[0] ||
    ads.find((a) => a.id === selectedId) ||
    ads[0] ||
    null;

  return (
    <div className="aa-review-layout">
      <section className="aa-review-list card">
        <div className="card-head-row">
          <div>
            <h3>Ads</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Filter + sort · click to preview
            </p>
          </div>
          <span className="badge muted">
            {filtered.length}/{ads.length}
          </span>
        </div>

        <div className="aa-filters">
          <input
            className="aa-filter-input"
            placeholder="Search ad name or copy…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="aa-filter-select"
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
          >
            <option value="all">All types</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="search">Search / text</option>
          </select>
          <select
            className="aa-filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "active" | "other")}
          >
            <option value="all">All statuses</option>
            <option value="active">Active / enabled</option>
            <option value="other">Paused / other</option>
          </select>
          <select
            className="aa-filter-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="spend">Sort: spend</option>
            <option value="clicks">Sort: clicks</option>
            <option value="ctr">Sort: CTR</option>
            <option value="conversions">Sort: conversions</option>
            <option value="cpa">Sort: CPA (worst first)</option>
          </select>
        </div>

        <div className="aa-ad-table-wrap">
          <table className="table aa-ad-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Status</th>
                <th>Spend</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ad) => {
                const href = `?${baseQs}&ad=${encodeURIComponent(ad.id)}`;
                const active = selected?.id === ad.id;
                const kind = isVideo(ad)
                  ? "Video"
                  : isImage(ad)
                    ? "Image"
                    : "Search";
                return (
                  <tr
                    key={ad.id}
                    className={`row-clickable ${active ? "row-selected" : ""}`}
                  >
                    <td>
                      <Link href={href} scroll={false} className="campaign-link">
                        <div className="client-name">{ad.name}</div>
                        <div className="client-meta">
                          {kind}
                          {ad.cta ? ` · ${ad.cta}` : ""}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <Link href={href} scroll={false} className="muted">
                        {ad.status}
                      </Link>
                    </td>
                    <td className="mono">
                      <Link href={href} scroll={false}>
                        {money(ad.metrics.spend)}
                      </Link>
                    </td>
                    <td className="mono">
                      <Link href={href} scroll={false}>
                        {num(ad.metrics.clicks)}
                      </Link>
                    </td>
                    <td className="mono">
                      <Link href={href} scroll={false}>
                        {pct(ad.metrics.ctr)}
                      </Link>
                    </td>
                    <td className="mono">
                      <Link href={href} scroll={false}>
                        {num(ad.metrics.conversions)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6}>
                    <span className="muted">No ads match these filters.</span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="aa-review-preview">
        <div className="card-head-row" style={{ marginBottom: 10 }}>
          <div>
            <div className="eyebrow">Live preview</div>
            <h3 style={{ margin: 0 }}>{selected?.name || "Select an ad"}</h3>
          </div>
          {selected ? (
            <span className="badge blue">{money(selected.metrics.spend)}</span>
          ) : null}
        </div>
        {selected ? (
          <AdPreviewCard
            ad={selected}
            clientSlug={clientSlug}
            clientName={clientName}
            logoUrl={logoUrl}
            selected
          />
        ) : (
          <div className="card">
            <p className="muted">Select an ad from the table.</p>
          </div>
        )}
      </section>
    </div>
  );
}
