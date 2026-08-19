/** Safe fetch JSON. Ads APIs sometimes return HTML login/error pages. */
export async function readJsonResponse(res: Response, label: string) {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${label}: empty response (${res.status})`);
  }
  const looksHtml =
    trimmed.startsWith("<") ||
    trimmed.toLowerCase().startsWith("<!doctype") ||
    trimmed.toLowerCase().includes("<html");
  if (looksHtml) {
    const title = trimmed.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    throw new Error(
      `${label}: HTML instead of JSON (${res.status}${title ? ` · ${title}` : ""}). Usually a login page, proxy, or blocked developer token.`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: invalid JSON (${res.status})`);
  }
}
