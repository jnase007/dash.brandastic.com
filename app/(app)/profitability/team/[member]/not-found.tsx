import Link from "next/link";

export default function TeamMemberNotFound() {
  return (
    <div className="pr-page">
      <div className="pr-panel">
        <h1>Team member not found</h1>
        <p className="pr-note">That person is not on the Employees team and has no Tempo time in this report.</p>
        <Link href="/profitability/team" className="pr-back">
          ← All team members
        </Link>
      </div>
    </div>
  );
}
