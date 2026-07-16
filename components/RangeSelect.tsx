"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  encodeCustomRange,
  isCustomRange,
  normalizeRange,
  parseCustomRange,
} from "@/lib/format";

const PRESETS = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export function RangeSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const range = normalizeRange(value);

  const custom = useMemo(() => parseCustomRange(range), [range]);
  const [from, setFrom] = useState(custom?.since || daysAgoIso(30));
  const [to, setTo] = useState(custom?.until || todayIso());
  const [openCustom, setOpenCustom] = useState(isCustomRange(range));

  useEffect(() => {
    const next = parseCustomRange(range);
    if (next) {
      setFrom(next.since);
      setTo(next.until);
      setOpenCustom(true);
    } else {
      setOpenCustom(false);
    }
  }, [range]);

  function pushRange(nextRange: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", normalizeRange(nextRange));
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    const a = from <= to ? from : to;
    const b = from <= to ? to : from;
    pushRange(encodeCustomRange(a, b));
  }

  const selectValue = isCustomRange(range) ? "custom" : range;

  return (
    <div className="range-picker">
      <select
        className="select"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") {
            setOpenCustom(true);
            if (!custom) {
              setFrom(daysAgoIso(30));
              setTo(todayIso());
            }
            return;
          }
          setOpenCustom(false);
          pushRange(v);
        }}
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
        <option value="custom">Custom range…</option>
      </select>

      {openCustom ? (
        <div className="range-custom">
          <label className="range-field">
            <span>From</span>
            <input
              type="date"
              className="select range-date"
              value={from}
              max={to || todayIso()}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="range-field">
            <span>To</span>
            <input
              type="date"
              className="select range-date"
              value={to}
              min={from || undefined}
              max={todayIso()}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button type="button" className="btn ghost small" onClick={applyCustom}>
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
