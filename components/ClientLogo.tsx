"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";

type CropState = {
  src: string;
  naturalW: number;
  naturalH: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const LS_PREFIX = "dash.logo.";

function readLocalLogo(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_PREFIX + slug);
  } catch {
    return null;
  }
}

function writeLocalLogo(slug: string, url: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (url) window.localStorage.setItem(LS_PREFIX + slug, url);
    else window.localStorage.removeItem(LS_PREFIX + slug);
  } catch {
    // ignore quota / private mode
  }
}

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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const [url, setUrl] = useState<string | null>(logoUrl || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);

  useEffect(() => {
    // Prefer server/Blob URL; fall back to local sticky copy so refresh keeps logo
    // even if SSR was stale.
    const local = readLocalLogo(slug);
    setUrl(logoUrl || local || null);
  }, [logoUrl, slug]);

  // Always re-check Blob after mount/refresh so uploads stick even if the
  // server-rendered page had a stale empty logoUrl.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/logos/${encodeURIComponent(slug)}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (cancelled || !json?.ok) return;
        if (json.url) {
          const next = `${json.url}${json.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
          setUrl(next);
          // Store the clean Blob URL (no bust query) for sticky reloads.
          writeLocalLogo(slug, json.url);
        } else if (!logoUrl) {
          // Keep local sticky logo if API has not caught up yet.
          const local = readLocalLogo(slug);
          if (local) setUrl(local);
          else setUrl(null);
        }
      } catch {
        // keep server/local logo if live lookup fails
        const local = readLocalLogo(slug);
        if (!logoUrl && local) setUrl(local);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, logoUrl]);

  function openPicker() {
    if (!editable || busy) return;
    setErr(null);
    inputRef.current?.click();
  }

  function onPick(file: File | null) {
    if (!file || !editable) return;
    setErr(null);

    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image is too large (max 8MB before crop)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        const stage = 320;
        const frameInset = 10;
        const frame = stage - frameInset * 2; // blue crop window
        // Contain full logo inside the framed square with padding so marks aren't clipped.
        const pad = 0.84;
        const fit =
          Math.min(frame / img.naturalWidth, frame / img.naturalHeight) * pad;
        setCrop({
          src,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          zoom: fit,
          offsetX: (stage - img.naturalWidth * fit) / 2,
          offsetY: (stage - img.naturalHeight * fit) / 2,
        });
      };
      img.onerror = () => setErr("Could not read that image");
      img.src = src;
    };
    reader.onerror = () => setErr("Could not read that image");
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragStart(e: ReactPointerEvent<HTMLDivElement>) {
    if (!crop) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: crop.offsetX,
      oy: crop.offsetY,
    };
  }

  function onDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!crop || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setCrop({
      ...crop,
      offsetX: dragRef.current.ox + dx,
      offsetY: dragRef.current.oy + dy,
    });
  }

  function onDragEnd() {
    dragRef.current = null;
  }

  async function exportCroppedPng(state: CropState): Promise<string> {
    const img = await loadImage(state.src);
    const canvas = document.createElement("canvas");
    const out = 512;
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    // White square export keeps logos readable in the monogram UI.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);

    // The blue frame inset is 10px on the 320 stage — export only the framed square.
    const stage = 320;
    const frameInset = 10;
    const frame = stage - frameInset * 2;
    const scale = out / frame;
    const dw = img.naturalWidth * state.zoom * scale;
    const dh = img.naturalHeight * state.zoom * scale;
    // Convert stage offsets into framed-export coordinates
    const dx = (state.offsetX - frameInset) * scale;
    const dy = (state.offsetY - frameInset) * scale;
    ctx.drawImage(img, dx, dy, dw, dh);
    return canvas.toDataURL("image/png");
  }

  async function saveCrop() {
    if (!crop) return;
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await exportCroppedPng(crop);
      const res = await fetch(`/api/logos/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          dataUrl,
          filename: `${slug}-logo.png`,
        }),
      });
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          text?.slice(0, 180) ||
            `Upload failed (${res.status}) — empty/invalid response`
        );
      }
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Upload failed (${res.status})`);
      }
      if (!json.url) throw new Error("Upload succeeded but no logo URL returned");
      const bust = json.cacheBust || Date.now();
      setUrl(`${json.url}${json.url.includes("?") ? "&" : "?"}t=${bust}`);
      writeLocalLogo(slug, json.url);
      setCrop(null);
      // Soft-refresh RSC payload so refresh/navigation keeps the saved logo.
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
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
          onClick={openPicker}
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
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
      ) : null}

      {err ? <div className="client-logo-error">{err}</div> : null}

      {crop ? (
        <div className="logo-crop-modal" role="dialog" aria-modal="true">
          <div className="logo-crop-card">
            <div className="logo-crop-head">
              <div>
                <div className="kicker">Logo crop</div>
                <strong>Fit {name} into the square</strong>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => (!busy ? setCrop(null) : null)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>

            <div
              className="logo-crop-stage"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crop.src}
                alt=""
                draggable={false}
                style={{
                  width: crop.naturalW * crop.zoom,
                  height: crop.naturalH * crop.zoom,
                  transform: `translate(${crop.offsetX}px, ${crop.offsetY}px)`,
                }}
              />
              <div className="logo-crop-frame" />
            </div>

            <label className="logo-crop-zoom">
              <span>Zoom</span>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.01}
                value={crop.zoom}
                onChange={(e) =>
                  setCrop({ ...crop, zoom: Number(e.target.value) })
                }
              />
            </label>

            <p className="muted logo-crop-help">
              Drag to position. Zoom to fill the square. We’ll save a clean
              512×512 PNG.
            </p>

            {err ? <div className="badge warn">{err}</div> : null}

            <div className="logo-crop-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                Choose another
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={saveCrop}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save square logo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for crop"));
    img.src = src;
  });
}
