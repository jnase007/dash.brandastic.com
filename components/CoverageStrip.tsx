import Link from "next/link";
import {
  coverageLabel,
  coverageTone,
  type ClientCoverage,
} from "@/lib/coverage";

function Dot({ status }: { status: ClientCoverage["meta"] }) {
  const tone = coverageTone(status);
  return (
    <span
      className={`coverage-dot ${tone}`}
      title={coverageLabel(status)}
      aria-label={coverageLabel(status)}
    />
  );
}

export function CoverageStrip({
  clients,
  totals,
  compact = false,
}: {
  clients: ClientCoverage[];
  totals: {
    clients: number;
    metaLive: number;
    googleLive: number;
    seoReady: number;
    gaps: number;
  };
  compact?: boolean;
}) {
  const gaps = clients.filter((c) => c.score < 3 || c.notes.length > 0);

  return (
    <div className={`coverage-strip ${compact ? "compact" : ""}`}>
      <div className="coverage-strip-head">
        <div>
          <div className="eyebrow">Coverage health</div>
          <strong>
            {totals.metaLive}/{totals.clients} Meta live · {totals.googleLive}/
            {totals.clients} Google live · {totals.seoReady}/{totals.clients} SEO
            ready
          </strong>
        </div>
        <span className={`badge ${totals.gaps ? "warn" : "blue"}`}>
          {totals.gaps ? `${totals.gaps} gaps` : "All channels ready"}
        </span>
      </div>

      <div className="coverage-grid">
        {clients.map((c) => (
          <Link
            key={c.slug}
            href={`/clients/${c.slug}`}
            className={`coverage-chip score-${c.score}`}
            title={c.notes.join(" · ") || "All channels mapped"}
          >
            <span className="coverage-chip-name">{c.name}</span>
            <span className="coverage-channels">
              <span className="coverage-ch">
                <Dot status={c.meta} /> M
              </span>
              <span className="coverage-ch">
                <Dot status={c.google} /> G
              </span>
              <span className="coverage-ch">
                <Dot status={c.seo} /> S
              </span>
            </span>
          </Link>
        ))}
      </div>

      {gaps.length ? (
        <div className="coverage-gaps">
          {gaps.slice(0, 6).map((g) => (
            <div key={g.slug} className="coverage-gap-row">
              <strong>{g.name}</strong>
              <span className="muted">{g.notes.join(" · ")}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
