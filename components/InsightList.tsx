import type { Insight } from "@/lib/insights";

const tone: Record<string, string> = {
  high: "danger",
  medium: "warn",
  low: "muted",
  positive: "ok",
};

export function InsightList({
  insights,
  empty = "No recommendations yet for this range.",
}: {
  insights: Insight[];
  empty?: string;
}) {
  if (!insights.length) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <div className="insight-list">
      {insights.map((i) => (
        <div key={i.id} className="insight-card">
          <div className="insight-top">
            <span className={`badge ${tone[i.severity] || "muted"}`}>
              {i.severity}
            </span>
            {i.platform ? <span className="badge muted">{i.platform}</span> : null}
            {i.metricHint ? <span className="insight-metric">{i.metricHint}</span> : null}
          </div>
          <strong>{i.title}</strong>
          {i.clientName ? <div className="client-meta">{i.clientName}</div> : null}
          <p>{i.body}</p>
          <div className="insight-rec">
            <span>Recommendation</span>
            {i.recommendation}
          </div>
        </div>
      ))}
    </div>
  );
}
