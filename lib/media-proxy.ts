/** Rewrite Meta/FB CDN asset URLs through our authenticated proxy. */

const ALLOWED_HOST_SUFFIXES = [
  "fbcdn.net",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "cdninstagram.com",
  "fbsbx.com",
];

export function isProxyableMediaUrl(raw?: string | null): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

/** Client-facing path that streams the remote asset server-side. */
export function proxiedMediaUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("/api/meta/media")) return raw;
  if (!isProxyableMediaUrl(raw)) return raw;
  return `/api/meta/media?url=${encodeURIComponent(raw)}`;
}

export function allowMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}
