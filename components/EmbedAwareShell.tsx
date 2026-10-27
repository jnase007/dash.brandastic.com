"use client";

import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopChrome } from "@/components/TopChrome";

export function EmbedAwareShell({
  children,
  clients,
}: {
  children: React.ReactNode;
  clients: { name: string; slug: string }[];
}) {
  const embed = useSearchParams().get("embed") === "1";

  if (embed) {
    return <main className="main embed-main">{children}</main>;
  }

  return (
    <div className="app-shell premium-shell">
      <Sidebar />
      <div className="main-wrap">
        <TopChrome clients={clients} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
