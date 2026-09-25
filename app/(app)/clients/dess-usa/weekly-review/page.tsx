import Link from "next/link";
import { DessWeeklyReviewBoard } from "@/components/DessWeeklyReviewBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DessWeeklyReviewPage() {
  return (
    <div>
      <div className="topbar no-print">
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            <Link href="/clients">Clients</Link>
            {" / "}
            <Link href="/clients/dess-usa">DESS USA</Link>
            {" / Weekly review"}
          </div>
        </div>
        <div className="top-actions">
          <Link className="btn ghost" href="/clients/dess-usa">
            DESS dashboard
          </Link>
          <Link className="btn ghost" href="/reports/dess-usa/google">
            Google report
          </Link>
        </div>
      </div>
      <DessWeeklyReviewBoard />
    </div>
  );
}
