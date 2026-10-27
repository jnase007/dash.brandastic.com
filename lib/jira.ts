const JIRA_CLOUD_ID = process.env.JIRA_CLOUD_ID || "db079a86-47fc-4866-b8fc-b57f066be4bb";
const BATCH = 100;
const MIN_GAP_MS = 500;
const MAX_BACKOFF_MS = 10_000;

export type JiraIssueProject = { projectId: string; key: string; name: string };

type JiraIssue = {
  id?: string;
  key?: string;
  fields?: { project?: { id?: string; key?: string; name?: string } };
};

/**
 * Read project name and key for issue ids Tempo could not name.
 * One batch at a time. On 429, wait for Retry-After (capped) and retry that batch once, then stop.
 */
export async function lookupJiraIssues(issueIds: string[]): Promise<Map<string, JiraIssueProject>> {
  const found = new Map<string, JiraIssueProject>();
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const ids = [...new Set(issueIds.filter((id) => /^\d+$/.test(id)))];
  if (!email || !token || ids.length === 0) return found;

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  let lastCall = 0;
  const pace = async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCall);
    if (wait > 0) await delay(wait);
    lastCall = Date.now();
  };

  try {
    for (let index = 0; index < ids.length; index += BATCH) {
      const chunk = ids.slice(index, index + BATCH);
      const issues = await fetchBatch(auth, chunk, pace);
      if (issues === "stop") break;
      for (const issue of issues) {
        const project = issue.fields?.project;
        const key = project?.key || issue.key?.split("-")[0] || "";
        if (!issue.id || !key) continue;
        found.set(issue.id, {
          projectId: String(project?.id || ""),
          key,
          name: (project?.name || key).trim(),
        });
      }
    }
  } catch (error) {
    console.error("Jira issue lookup failed", error instanceof Error ? error.message : "request failed");
  }
  return found;
}

async function fetchBatch(auth: string, ids: string[], pace: () => Promise<void>, attempt = 0): Promise<JiraIssue[] | "stop"> {
  await pace();
  const response = await fetch(`https://api.atlassian.com/ex/jira/${JIRA_CLOUD_ID}/rest/api/3/issue/bulkfetch`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ issueIdsOrKeys: ids, fields: ["project", "key"] }),
  });
  if (response.status === 429) {
    if (attempt > 0) return "stop";
    const header = Number(response.headers.get("retry-after"));
    const wait = Number.isFinite(header) && header > 0 ? Math.min(header * 1000, MAX_BACKOFF_MS) : 2000;
    await delay(wait);
    return fetchBatch(auth, ids, pace, attempt + 1);
  }
  if (response.status === 401 || response.status === 403) {
    console.error(`Jira issue lookup stopped (${response.status})`);
    return "stop";
  }
  if (!response.ok) {
    console.error(`Jira issue lookup skipped a batch (${response.status})`);
    return [];
  }
  const body = (await response.json()) as { issues?: JiraIssue[] };
  return body.issues || [];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
