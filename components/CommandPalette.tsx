"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
};

const BASE: Item[] = [
  { id: "home", label: "Overview / Priority Inbox", href: "/", group: "Navigate" },
  { id: "clients", label: "All clients", href: "/clients", group: "Navigate" },
  { id: "insights", label: "AI Insights", href: "/insights", group: "Navigate" },
  { id: "reports", label: "Client reports", href: "/reports", group: "Navigate" },
  { id: "meta", label: "Meta Ads", href: "/meta", group: "Navigate" },
  { id: "google", label: "Google Ads", href: "/google", group: "Navigate" },
];

export function CommandPalette({
  clients = [],
}: {
  clients?: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    const clientItems: Item[] = clients.flatMap((c) => [
      {
        id: `c-${c.slug}`,
        label: c.name,
        hint: "Client dashboard",
        href: `/clients/${c.slug}`,
        group: "Clients",
      },
      {
        id: `r-${c.slug}`,
        label: `${c.name} report`,
        hint: "Custom report",
        href: `/reports/${c.slug}`,
        group: "Reports",
      },
    ]);
    const all = [...BASE, ...clientItems];
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (i) =>
        i.label.toLowerCase().includes(query) ||
        (i.hint || "").toLowerCase().includes(query) ||
        i.group.toLowerCase().includes(query)
    );
  }, [clients, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setActive(0), [q, open]);

  if (!open) {
    return (
      <button
        type="button"
        className="cmd-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <span>Search clients, reports…</span>
        <kbd>⌘K</kbd>
      </button>
    );
  }

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div
        className="cmd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <input
          autoFocus
          className="cmd-input"
          placeholder="Jump to client, report, or page…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && items[active]) {
              e.preventDefault();
              go(items[active].href);
            }
          }}
        />
        <div className="cmd-list">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`cmd-item ${idx === active ? "active" : ""}`}
              onMouseEnter={() => setActive(idx)}
              onClick={() => go(item.href)}
            >
              <div>
                <strong>{item.label}</strong>
                {item.hint ? <span>{item.hint}</span> : null}
              </div>
              <em>{item.group}</em>
            </button>
          ))}
          {!items.length ? <div className="cmd-empty">No matches</div> : null}
        </div>
      </div>
    </div>
  );
}
