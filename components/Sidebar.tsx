"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEAM } from "@/lib/brand";

const links = [
  { href: "/", label: "Overview", icon: "◉" },
  { href: "/clients", label: "Clients", icon: "◎" },
  { href: "/insights", label: "AI Insights", icon: "✦" },
  { href: "/reports", label: "Reports", icon: "☰" },
  { href: "/meta", label: "Meta Ads", icon: "◈" },
  { href: "/google", label: "Google Ads", icon: "◇" },
];

const updates = [
  {
    title: "AgencyAnalytics replacement",
    body: "Custom client reports + AI recommendations are live in Dash.",
  },
  {
    title: "Demo mode until tokens",
    body: "Connect Meta + Google to unlock live campaign data.",
  },
  {
    title: "Review only",
    body: "No campaign edits, pauses, or budget changes from Dash.",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar light">
      <div className="brand">
        <img src="/brand/logo-black.png" alt="Brandastic" className="brand-logo" />
        <div>
          <strong>Brandastic</strong>
          <span>Ads Dash</span>
        </div>
      </div>

      <nav className="nav">
        {links.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/"
              : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href} className={active ? "active" : ""}>
              <span className="nav-icon">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="nav-label">Updates</div>
      <div className="updates">
        {updates.map((u) => (
          <div key={u.title} className="update-card">
            <strong>{u.title}</strong>
            <span>{u.body}</span>
          </div>
        ))}
      </div>

      <div className="nav-label">Team</div>
      <div className="team-stack">
        {TEAM.slice(0, 4).map((m) => (
          <div key={m.name} className="team-mini">
            <img src={m.image} alt={m.name} />
            <div>
              <strong>{m.name}</strong>
              <span>{m.role}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        Review-only Meta + Google dashboard for the Brandastic team and clients.
      </div>
    </aside>
  );
}
