"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEAM } from "@/lib/brand";

const links = [
  { href: "/", label: "Overview", icon: "◉" },
  { href: "/clients", label: "Clients", icon: "◎" },
  { href: "/insights", label: "AI Insights", icon: "✦" },
  { href: "/reports", label: "Reports", icon: "☰" },
  { href: "/seo", label: "SEO", icon: "▤" },
  { href: "/meta", label: "Meta Ads", icon: "◈" },
  { href: "/google", label: "Google Ads", icon: "◇" },
  { href: "/approvals", label: "Approvals", icon: "✓" },
];

const updates = [
  {
    title: "Operator inbox",
    body: "Live prior-period + coverage flags on Overview.",
  },
  {
    title: "Google ad review",
    body: "RSA previews + search terms on campaign pages.",
  },
  {
    title: "Print / PDF reports",
    body: "Client report → Print / PDF for meetings.",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar light">
      <div className="brand">
        <img src="/brand/mark-circle.png" alt="Brandastic" className="brand-logo mark" />
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
        {TEAM.slice(0, 5).map((m) => (
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
        Review-only Meta, Google, and Semrush SEO for the Brandastic team.
      </div>
    </aside>
  );
}
