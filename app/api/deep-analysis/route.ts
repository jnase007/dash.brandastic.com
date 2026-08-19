import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import {
  getLiveDeepAnalysis,
  listLiveDeepAccounts,
  liveDeepStatus,
} from "@/lib/live-deep-analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "summary";

  try {
    if (view === "status") {
      return NextResponse.json(liveDeepStatus());
    }
    if (view === "accounts") {
      const status = liveDeepStatus();
      return NextResponse.json({
        configured: status.configured,
        accounts: listLiveDeepAccounts(),
        resultGroups: status.resultGroups,
      });
    }
    if (view === "analysis") {
      const platform = (url.searchParams.get("platform") || "meta") as "meta" | "google";
      const accountId = url.searchParams.get("accountId") || "";
      const range = url.searchParams.get("range") || "30d";
      const resultGroup = url.searchParams.get("resultGroup") || "purchases";
      if (!accountId) {
        return NextResponse.json({ error: "accountId required" }, { status: 400 });
      }
      const data = await getLiveDeepAnalysis({
        platform,
        accountId,
        range,
        resultGroup,
      });
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "unknown view" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "deep analysis failed" },
      { status: 500 }
    );
  }
}
