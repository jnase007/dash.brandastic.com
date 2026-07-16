"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type CropState = {
  src: string;
  naturalW: number;
  naturalH: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

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
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const [url, setUrl] = useState<string | null>(logoUrl || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);

  useEffect(() => {
    setUrl(logoUrl || null);
  }, [logoUrl]);

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
        const minSide = Math.min(img.naturalWidth, img.naturalHeight);
        // Fit image so the shorter side fills the square at zoom 1
        const fit = 320 / minSide;
        setCrop({
          src,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          zoom: fit,
          offsetX: (320 - img.naturalWidth * fit) / 2,
          offsetY: (320 - img.naturalHeight * fit) / 2,
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

    // white background so transparent logos still look clean in monogram squares
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);

    const scale = out / 320;
    const dw = img.naturalWidth * state.zoom * scale;
    const dh = img.naturalHeight * state.zoom * scale;
    const dx = state.offsetX * scale;
    const dy = state.offsetY * scale;
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
      setUrl(`${json.url}${json.url.includes("?") ? "&" : "?"}t=${Date.now()}`);
      setCrop(null);
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
              Drag to position. Zoom to fill the square. We’ll save a clean 512×512 PNG.
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
