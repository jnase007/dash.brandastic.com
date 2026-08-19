"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Account = {
  platform: "meta" | "google";
  id: string;
  name: string;
  currency?: string;
};

export function DeepAnalysisControls({
  platform,
  accountId,
  resultGroup,
  accounts,
  resultGroups,
}: {
  platform: "meta" | "google";
  accountId: string;
  resultGroup: string;
  accounts: Account[];
  resultGroups: { id: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function push(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  const filtered = accounts.filter((a) => a.platform === platform);

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label className="range-field">
          <span>Platform</span>
          <select
            className="select"
            value={platform}
            onChange={(e) => {
              const p = e.target.value as "meta" | "google";
              const first = accounts.find((a) => a.platform === p);
              push({
                platform: p,
                accountId: first?.id || "",
                resultGroup: p === "google" ? "" : resultGroup,
              });
            }}
          >
            <option value="meta">Meta</option>
            <option value="google">Google Ads</option>
          </select>
        </label>

        <label className="range-field" style={{ minWidth: 280, flex: 1 }}>
          <span>Account</span>
          <select
            className="select"
            value={accountId}
            onChange={(e) => push({ accountId: e.target.value })}
          >
            {!filtered.length ? (
              <option value="">No mapped accounts</option>
            ) : (
              filtered.map((a) => (
                <option key={`${a.platform}:${a.id}`} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))
            )}
          </select>
        </label>

        {platform === "meta" ? (
          <label className="range-field">
            <span>Result type</span>
            <select
              className="select"
              value={resultGroup}
              onChange={(e) => push({ resultGroup: e.target.value })}
            >
              {resultGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        Account list comes from the live dash client map. Same Meta and Google
        connectors as Overview.
      </div>
    </div>
  );
}
