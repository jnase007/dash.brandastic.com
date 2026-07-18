import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { getClientSemrushSeo, getPortfolioSemrushSeo } from "@/lib/semrush";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "";
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

  try {
    if (slug) {
      const client = getClient(slug);
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      const seo = await getClientSemrushSeo(client, { keywordLimit: limit });
      return NextResponse.json({ ok: true, seo });
    }

    const portfolio = await getPortfolioSemrushSeo({ keywordLimit: limit });
    return NextResponse.json({ ok: true, ...portfolio });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "SEO fetch failed" },
      { status: 500 }
    );
  }
}
