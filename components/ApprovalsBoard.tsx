"use client";

import { useMemo, useState, useTransition } from "react";
import type { ApprovalItem, ApprovalStatus } from "@/lib/approvals";

type StateRow = {
  status: ApprovalStatus;
  note?: string;
  updatedAt: string;
  updatedBy?: string;
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending Justin",
  approved: "Approved",
  rejected: "Rejected",
  shipped: "Shipped",
};

const STATUS_BADGE: Record<ApprovalStatus, string> = {
  pending: "warn",
  approved: "ok",
  rejected: "danger",
  shipped: "blue",
};

const RISK_BADGE: Record<string, string> = {
  low: "ok",
  medium: "warn",
  high: "danger",
};

export function ApprovalsBoard({
  items,
  initialState,
  persist,
}: {
  items: ApprovalItem[];
  initialState: Record<string, StateRow>;
  persist: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | ApprovalStatus>("all");

  const visible = useMemo(() => {
    return items.filter((item) => {
      const st = state[item.id]?.status || item.defaultStatus;
      return filter === "all" ? true : st === filter;
    });
  }, [items, state, filter]);

  function setStatus(id: string, status: ApprovalStatus) {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status,
            note: notes[id] || undefined,
            updatedBy: "Justin / team",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Save failed");
        setState(json.state);
        if (json.persist === false) {
          setMsg(
            json.persistNote ||
              "Status updated for this session only (Blob persist unavailable)."
          );
        } else {
          setMsg(`Saved: ${STATUS_LABEL[status]}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div>
      <div className="pill-row" style={{ marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["all", "All"],
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["shipped", "Shipped"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn ghost small ${filter === key ? "primary" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
        <span className={`badge ${persist ? "ok" : "warn"}`}>
          {persist ? "Persisted via Blob" : "Local session only"}
        </span>
      </div>

      {error ? (
        <div className="notice" style={{ marginBottom: 12, borderColor: "#f5a0a0" }}>
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="notice" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      ) : null}

      <div className="grid-2" style={{ gap: 16 }}>
        {visible.map((item) => {
          const row = state[item.id];
          const status = row?.status || item.defaultStatus;
          return (
            <article key={item.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card-head-row">
                <div>
                  <div className="eyebrow">Feature proposal</div>
                  <h3 style={{ margin: "4px 0 0" }}>{item.name}</h3>
                </div>
                <span className={`badge ${STATUS_BADGE[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>

              <p style={{ margin: 0, lineHeight: 1.5 }}>{item.description}</p>

              <div className="notice" style={{ margin: 0 }}>
                <strong>Why now</strong>
                <div>{item.why}</div>
                {item.exampleGap ? (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge blue">Example gap</span>{" "}
                    {item.exampleGap}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Impacts on current Dash
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {item.impacts.map((imp) => (
                    <div
                      key={imp.area}
                      style={{
                        border: "1px solid var(--border, #e6e8ee)",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <strong>{imp.area}</strong>
                        <span className={`badge ${RISK_BADGE[imp.risk] || "muted"}`}>
                          {imp.risk} risk
                        </span>
                      </div>
                      <div style={{ opacity: 0.85, fontSize: 14, lineHeight: 1.45 }}>
                        {imp.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span className="eyebrow">Justin note (optional)</span>
                <textarea
                  value={notes[item.id] ?? row?.note ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [item.id]: e.target.value }))
                  }
                  rows={2}
                  placeholder="e.g. Approve feature 1 first, then create-client UI"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid var(--border, #d8dde8)",
                    padding: "10px 12px",
                    font: "inherit",
                    resize: "vertical",
                  }}
                />
              </label>

              <div className="pill-row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn primary small"
                  disabled={pending || status === "approved"}
                  onClick={() => setStatus(item.id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={pending || status === "rejected"}
                  onClick={() => setStatus(item.id, "rejected")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={pending || status === "pending"}
                  onClick={() => setStatus(item.id, "pending")}
                >
                  Reset pending
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={pending || status === "shipped"}
                  onClick={() => setStatus(item.id, "shipped")}
                >
                  Mark shipped
                </button>
              </div>

              {row?.updatedAt && row.updatedAt !== new Date(0).toISOString() ? (
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Last update {new Date(row.updatedAt).toLocaleString()}
                  {row.updatedBy ? ` · ${row.updatedBy}` : ""}
                  {row.note ? ` · “${row.note}”` : ""}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Requested by {item.requestedBy} · awaiting decision
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!visible.length ? (
        <div className="card" style={{ marginTop: 12 }}>
          No proposals in this filter.
        </div>
      ) : null}
    </div>
  );
}
