import { list } from "@vercel/blob";
import { unstable_noStore as noStore } from "next/cache";

const PREFIX = "client-logos/";

export function logoPathname(slug: string, ext = "png") {
  const safe = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `${PREFIX}${safe}.${ext}`;
}

export function logoTag(slug: string) {
  const safe = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `logo:${safe}`;
}

export async function getClientLogoUrl(slug: string): Promise<string | null> {
  // Never cache empty/stale logo lookups across requests.
  noStore();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const safe = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  try {
    const { blobs } = await list({
      prefix: `${PREFIX}${safe}.`,
      limit: 10,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!blobs?.length) return null;
    // newest first
    const sorted = [...blobs].sort(
      (a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)
    );
    return sorted[0]?.url || null;
  } catch {
    return null;
  }
}

export async function getClientLogoMap(
  slugs: string[]
): Promise<Record<string, string>> {
  // Logo map must always reflect Blob, not a cached empty server render.
  noStore();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return {};
  try {
    const { blobs } = await list({
      prefix: PREFIX,
      limit: 100,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const map: Record<string, { url: string; uploadedAt: string }> = {};
    for (const b of blobs || []) {
      const name = b.pathname.replace(PREFIX, "");
      const slug = name.split(".")[0];
      if (!slug) continue;
      if (!slugs.includes(slug)) continue;
      const prev = map[slug];
      if (!prev || +new Date(b.uploadedAt) > +new Date(prev.uploadedAt)) {
        map[slug] = { url: b.url, uploadedAt: String(b.uploadedAt) };
      }
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) out[k] = v.url;
    return out;
  } catch {
    return {};
  }
}
