import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";

export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30d";
  const data = await getPortfolio(range);
  return NextResponse.json(data);
}
