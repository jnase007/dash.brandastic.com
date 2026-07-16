"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/clients", label: "Clients" },
  { href: "/meta", label: "Meta Ads" },
  { href: "/google", label: "Google Ads" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">B</div>
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
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="nav-label">Access</div>
      <div className="sidebar-foot">
        Review-only dashboard for Meta + Google Ads.
        <br />
        No campaign edits from this app.
      </div>
    </aside>
  );
}
