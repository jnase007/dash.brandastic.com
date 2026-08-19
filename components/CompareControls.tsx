"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_COMPARE_CURRENT } from "@/lib/compare-windows";
import { encodeCustomRange, parseCustomRange } from "@/lib/format";

const LOCKED = [
  { value: DEFAULT_COMPARE_CURRENT, label: "Aug 1–10, 2026" },
  { value: "2026-07-01_2026-07-10", label: "Jul 1–10, 2026" },
  { value: "2025-08-01_2025-08-10", label: "Aug 1–10, 2025" },
];

export function CompareControls({
  range,
  channel,
}: {
  range: string;
  channel: "combined" | "meta" | "google";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const custom = parseCustomRange(range);

  function push(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <label className="range-field">
          <span>Current window</span>
          <select
            className="select"
            value={LOCKED.some((o) => o.value === range) ? range : "custom"}
            onChange={(e) => {
              if (e.target.value === "custom") return;
              push({ range: e.target.value });
            }}
          >
            {LOCKED.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value="custom">Custom current…</option>
          </select>
        </label>
        <label className="range-field">
          <span>From</span>
          <input
            type="date"
            className="select range-date"
            value={custom?.since || "2026-08-01"}
            onChange={(e) =>
              push({
                range: encodeCustomRange(e.target.value, custom?.until || "2026-08-10"),
              })
            }
          />
        </label>
        <label className="range-field">
          <span>To</span>
          <input
            type="date"
            className="select range-date"
            value={custom?.until || "2026-08-10"}
            onChange={(e) =>
              push({
                range: encodeCustomRange(custom?.since || "2026-08-01", e.target.value),
              })
            }
          />
        </label>
        <label className="range-field">
          <span>Channel</span>
          <select
            className="select"
            value={channel}
            onChange={(e) => push({ channel: e.target.value })}
          >
            <option value="combined">Combined</option>
            <option value="meta">Meta</option>
            <option value="google">Google</option>
          </select>
        </label>
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        Compares the current window to the same days last month and last year.
        Default is Aug 1–10 vs Jul 1–10 vs Aug 1–10 2025. Columns are the same
        for every client.
      </div>
    </div>
  );
}
