import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { getClientLogoUrl, logoPathname } from "@/lib/logos";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!getClient(slug)) {
    return NextResponse.json({ ok: false, error: "Unknown client" }, { status: 404 });
  }
  const url = await getClientLogoUrl(slug);
  return NextResponse.json({ ok: true, slug, url });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  if (!getClient(slug)) {
    return NextResponse.json({ ok: false, error: "Unknown client" }, { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Logo storage not configured (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "File must be an image" }, { status: 400 });
  }

  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Max logo size is 4MB" }, { status: 400 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
          ? "svg"
          : "jpg";

  const pathname = logoPathname(slug, ext);
  const blob = await put(pathname, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: file.type,
  });

  return NextResponse.json({
    ok: true,
    slug,
    url: blob.url,
    pathname: blob.pathname,
  });
}
