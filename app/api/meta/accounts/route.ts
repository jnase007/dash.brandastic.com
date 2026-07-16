import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listMetaAdAccounts, metaConfigured } from "@/lib/meta";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!metaConfigured()) {
    return NextResponse.json(
      { error: "META_ACCESS_TOKEN not configured", accounts: [] },
      { status: 200 }
    );
  }
  try {
    const accounts = await listMetaAdAccounts();
    return NextResponse.json({ accounts });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Meta API error", accounts: [] },
      { status: 500 }
    );
  }
}
