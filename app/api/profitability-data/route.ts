import { NextResponse } from "next/server";
import { getTempoProfitability, getTempoProfitabilityForSlug } from "@/lib/tempo";

const ALLOW = new Set(["https://brandastic.co", "https://www.brandastic.co", "http://localhost:5173"]);

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "";
  if (!ALLOW.has(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin") || "";
  if (!ALLOW.has(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const slug = new URL(req.url).searchParams.get("slug")?.trim() || "";
    const data = slug ? await getTempoProfitabilityForSlug(slug) : await getTempoProfitability();
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tempo could not be loaded.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Access-Control-Allow-Origin": origin } }
    );
  }
}
