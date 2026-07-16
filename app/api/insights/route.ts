import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/data";
import { getPortfolioInsights } from "@/lib/insights";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30d";
  const limit = Math.min(Number(searchParams.get("limit") || 16), 30);

  try {
    const portfolio = await getPortfolio(range);
    const ai = await getPortfolioInsights(portfolio, { limit });
    return NextResponse.json({
      ok: true,
      range,
      engine: ai.engine,
      model: ai.model || null,
      note: ai.note || null,
      count: ai.insights.length,
      insights: ai.insights,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "insights failed" },
      { status: 500 }
    );
  }
}
