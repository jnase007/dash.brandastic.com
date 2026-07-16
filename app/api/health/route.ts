import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google-ads";
import { metaConfigured } from "@/lib/meta";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "dash.brandastic.com",
    meta: metaConfigured() ? "configured" : "missing",
    google: googleConfigured() ? "configured" : "missing",
    mode:
      process.env.FORCE_DEMO_DATA === "true"
        ? "demo-forced"
        : metaConfigured() || googleConfigured()
          ? "live-ready"
          : "demo",
    ts: new Date().toISOString(),
  });
}
