"use client";

import { useRef, useState } from "react";

export function ClientLogo({
  slug,
  name,
  monogram,
  accent,
  logoUrl,
  size = 44,
  editable = true,
}: {
  slug: string;
  name: string;
  monogram: string;
  accent: string;
  logoUrl?: string | null;
  size?: number;
  editable?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(logoUrl || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File | null) {
    if (!file || !editable) return;
    setBusy(true);
    setErr(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/logos/${encodeURIComponent(slug)}`, {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Upload failed");
      }
      setUrl(json.url);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const face = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`${name} logo`} />
  ) : (
    <span>{monogram}</span>
  );

  return (
    <div className="client-logo-wrap" style={{ width: size, height: size }}>
      {editable ? (
        <button
          type="button"
          className={`client-logo-btn ${url ? "has-logo" : ""}`}
          style={{
            width: size,
            height: size,
            background: url ? "#fff" : accent,
          }}
          title={`Upload logo for ${name}`}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {face}
          <span className="client-logo-overlay">
            {busy ? "…" : url ? "Change" : "Upload"}
          </span>
        </button>
      ) : (
        <div
          className={`client-logo-btn ${url ? "has-logo" : ""}`}
          style={{
            width: size,
            height: size,
            background: url ? "#fff" : accent,
          }}
          title={name}
        >
          {face}
        </div>
      )}
      {editable ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
      ) : null}
      {err ? <div className="client-logo-error">{err}</div> : null}
    </div>
  );
}
