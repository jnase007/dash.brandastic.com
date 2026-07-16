"use client";

import { CommandPalette } from "@/components/CommandPalette";

export function TopChrome({
  clients,
}: {
  clients: { name: string; slug: string }[];
}) {
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
