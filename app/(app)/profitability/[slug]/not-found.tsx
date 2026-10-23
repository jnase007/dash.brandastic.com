import Link from "next/link";

export default function ProfitabilityClientNotFound() {
  return (
    <div className="pr-page">
      <div className="pr-panel">
        <h1>Client not found</h1>
        <p className="pr-note">That client is not on the Brand Care Clients sheet.</p>
        <Link href="/profitability" className="pr-back">
          ← All clients
        </Link>
      </div>
    </div>
  );
}
