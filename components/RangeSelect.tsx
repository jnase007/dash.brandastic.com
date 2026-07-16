"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function RangeSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <select
      className="select"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("range", e.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
    >
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="90d">Last 90 days</option>
    </select>
  );
}
