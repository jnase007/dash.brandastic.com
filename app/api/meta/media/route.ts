import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { allowMediaHost } from "@/lib/media-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Authenticated media proxy for Meta/FB CDN assets.
 * Browser often blocks or fails direct fbcdn hotlinks; we stream server-side.
 * READ ONLY — no Meta write actions.
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }
  if (!allowMediaHost(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        // Some FB CDN edges are picky; mimic a normal browser image request.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8",
        Referer: "https://www.facebook.com/",
      },
      // short-lived cache at the edge of our fetch
      next: { revalidate: 3600 },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }

    const len = Number(upstream.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) {
      return NextResponse.json({ error: "Asset too large" }, { status: 413 });
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Asset too large" }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy failed" },
      { status: 502 }
    );
  }
}
