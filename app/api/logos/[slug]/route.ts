import { put } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { getClientLogoUrl, logoPathname, logoTag } from "@/lib/logos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BYTES = 4 * 1024 * 1024;

function extFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function parseUpload(req: Request): Promise<{
  bytes: Buffer;
  contentType: string;
  filename: string;
}> {
  const contentType = req.headers.get("content-type") || "";

  // Preferred path: JSON { dataUrl } or { base64, contentType }
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new Error("Invalid JSON body");
    }

    let dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    let mime =
      typeof body.contentType === "string" ? body.contentType : "image/png";
    let b64 = typeof body.base64 === "string" ? body.base64 : "";

    if (dataUrl.startsWith("data:")) {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error("Invalid data URL");
      mime = m[1];
      b64 = m[2];
    }

    if (!b64) throw new Error("Missing image data");
    if (!mime.startsWith("image/")) throw new Error("File must be an image");

    const bytes = Buffer.from(b64, "base64");
    if (!bytes.length) throw new Error("Empty image data");
    if (bytes.length > MAX_BYTES) throw new Error("Max logo size is 4MB");

    return {
      bytes,
      contentType: mime,
      filename: typeof body.filename === "string" ? body.filename : `logo.${extFromType(mime)}`,
    };
  }

  // Fallback: multipart form-data
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new Error("Could not read upload form data");
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    throw new Error("Missing file");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Max logo size is 4MB");
  }

  const ab = await file.arrayBuffer();
  return {
    bytes: Buffer.from(ab),
    contentType: file.type || "image/png",
    filename: file.name || `logo.${extFromType(file.type || "image/png")}`,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!getClient(slug)) return jsonError("Unknown client", 404);
    const url = await getClientLogoUrl(slug);
    return NextResponse.json(
      { ok: true, slug, url },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (e: any) {
    return jsonError(e?.message || "Logo lookup failed", 500);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!(await isAuthed())) return jsonError("Unauthorized", 401);

    const { slug } = await params;
    if (!getClient(slug)) return jsonError("Unknown client", 404);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Logo storage not configured (BLOB_READ_WRITE_TOKEN)", 503);
    }

    const upload = await parseUpload(req);
    const ext = extFromType(upload.contentType);
    const pathname = logoPathname(slug, ext);

    const blob = await put(pathname, upload.bytes, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: upload.contentType,
      cacheControlMaxAge: 60,
    });

    // Bust any cached page/logo lookups so refresh keeps the new logo.
    try {
      revalidateTag(logoTag(slug));
      revalidatePath("/");
      revalidatePath("/clients");
      revalidatePath(`/clients/${slug}`);
      revalidatePath("/reports");
      revalidatePath(`/reports/${slug}`);
    } catch {
      // best-effort; Blob write already succeeded
    }

    return NextResponse.json({
      ok: true,
      slug,
      url: blob.url,
      pathname: blob.pathname,
      cacheBust: Date.now(),
    });
  } catch (e: any) {
    const msg = e?.message || "Logo upload failed";
    const status =
      /unauthorized/i.test(msg) ? 401 :
      /missing|invalid|must be|max logo|empty/i.test(msg) ? 400 :
      500;
    return jsonError(msg, status);
  }
}
