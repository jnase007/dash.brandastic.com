export function StatusBadge({
  status,
}: {
  status: "connected" | "missing" | "error" | "live" | "demo" | "partial" | string;
}) {
  if (status === "connected" || status === "live")
    return <span className="badge ok">{status}</span>;
  if (status === "partial") return <span className="badge blue">partial</span>;
  if (status === "demo") return <span className="badge muted">demo</span>;
  if (status === "error") return <span className="badge warn">error</span>;
  return <span className="badge warn">{status}</span>;
}
