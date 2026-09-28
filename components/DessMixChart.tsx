"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CampaignReview } from "@/lib/dess-weekly-review";
import styles from "./DessWeeklyReviewBoard.module.css";

export function DessMixChart({
  rows,
  value,
  format,
  open,
  onOpen,
}: {
  rows: CampaignReview[];
  value: (c: CampaignReview) => number;
  format: (n: number) => string;
  open: string | null;
  onOpen: (name: string) => void;
}) {
  const data = rows.slice(0, 12).map((c) => ({
    name: c.name.length > 28 ? `${c.name.slice(0, 26)}…` : c.name,
    full: c.name,
    v: value(c),
  }));
  const h = Math.max(220, data.length * 28);

  return (
    <div className={styles.rechart}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke="#eef1f7" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11, fill: "#334155" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(n: number) => format(n)} />
          <Bar
            dataKey="v"
            fill="#0369a1"
            radius={[0, 4, 4, 0]}
            onClick={(d) => {
              const full = (d as { full?: string }).full;
              if (full) onOpen(full);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
