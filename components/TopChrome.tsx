"use client";

import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/CommandPalette";

export function TopChrome({
  clients,
}: {
  clients: { name: string; slug: string }[];
}) {
  const pathname = usePathname();
  if (pathname === "/profitability" || pathname.startsWith("/profitability/")) return null;

  return (
    <div className="top-chrome">
      <div className="top-chrome-left">
        <span className="eyebrow">Brandastic Ads Dash</span>
        <strong>Premium review workspace</strong>
      </div>
      <CommandPalette clients={clients} />
    </div>
  );
}
