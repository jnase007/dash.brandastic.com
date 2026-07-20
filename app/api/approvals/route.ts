import { list, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { APPROVAL_ITEMS, type ApprovalStatus } from "@/lib/approvals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PATH = "dash-approvals/state.json";
const VALID: ApprovalStatus[] = ["pending", "approved", "rejected", "shipped"];

type StateMap = Record<
  string,
  { status: ApprovalStatus; note?: string; updatedAt: string; updatedBy?: string }
>;

function defaultState(): StateMap {
  const out: StateMap = {};
  for (const item of APPROVAL_ITEMS) {
    out[item.id] = {
      status: item.defaultStatus,
      updatedAt: new Date(0).toISOString(),
    };
  }
  return out;
}

async function readState(): Promise<StateMap> {
  const base = defaultState();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return base;
  try {
    const { blobs } = await list({
      prefix: "dash-approvals/",
      limit: 20,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const hit = (blobs || [])
      .filter((b) => b.pathname === PATH || b.pathname.endsWith("state.json"))
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];
    if (!hit?.url) return base;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return base;
    const json = (await res.json()) as StateMap;
    return { ...base, ...json };
  } catch {
    return base;
  }
}

async function writeState(state: StateMap) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false as const, reason: "BLOB_READ_WRITE_TOKEN missing — status not persisted" };
  }
  await put(PATH, JSON.stringify(state, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { ok: true as const };
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const state = await readState();
  return NextResponse.json({
    items: APPROVAL_ITEMS,
    state,
    persist: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; status?: string; note?: string; updatedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = String(body.id || "");
  const status = String(body.status || "") as ApprovalStatus;
  if (!APPROVAL_ITEMS.some((i) => i.id === id)) {
    return NextResponse.json({ error: "Unknown approval id" }, { status: 400 });
  }
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const state = await readState();
  state[id] = {
    status,
    note: body.note ? String(body.note).slice(0, 500) : state[id]?.note,
    updatedAt: new Date().toISOString(),
    updatedBy: body.updatedBy ? String(body.updatedBy).slice(0, 80) : "team",
  };
  const saved = await writeState(state);
  return NextResponse.json({ ok: true, state, persist: saved.ok, persistNote: "reason" in saved ? saved.reason : null });
}
