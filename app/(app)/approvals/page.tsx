import { ApprovalsBoard } from "@/components/ApprovalsBoard";
import { APPROVAL_ITEMS, type ApprovalStatus } from "@/lib/approvals";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function loadState(): Promise<{ state: StateMap; persist: boolean }> {
  const base = defaultState();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { state: base, persist: false };
  }
  try {
    const { blobs } = await list({
      prefix: "dash-approvals/",
      limit: 20,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const hit = (blobs || [])
      .filter((b) => b.pathname.endsWith("state.json"))
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];
    if (!hit?.url) return { state: base, persist: true };
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return { state: base, persist: true };
    const json = (await res.json()) as StateMap;
    return { state: { ...base, ...json }, persist: true };
  } catch {
    return { state: base, persist: true };
  }
}

export default async function ApprovalsPage() {
  const { state, persist } = await loadState();
  const pendingCount = APPROVAL_ITEMS.filter(
    (i) => (state[i.id]?.status || i.defaultStatus) === "pending"
  ).length;

  return (
    <div className="page-premium">
      <div className="topbar">
        <div>
          <div className="eyebrow">Operator governance</div>
          <h1>Approvals</h1>
          <p>
            Feature proposals for Justin to approve before implementation ·{" "}
            {pendingCount} pending · name, description, and Dash impact included
          </p>
        </div>
        <div className="top-actions">
          <span className="badge warn">{pendingCount} pending</span>
          <span className="badge muted">Review-only ads stay review-only</span>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 16 }}>
        <strong>How this works</strong>
        <div>
          Jonathan (or team) files proposals here. Justin sets{" "}
          <em>Approve</em> / <em>Reject</em>. Chip only implements after
          approval. First batch covers missing clients like{" "}
          <strong>Hear Christian Academy</strong> (Google + Meta) and a manual
          client/account create flow.
        </div>
      </div>

      <ApprovalsBoard
        items={APPROVAL_ITEMS}
        initialState={state}
        persist={persist}
      />
    </div>
  );
}
