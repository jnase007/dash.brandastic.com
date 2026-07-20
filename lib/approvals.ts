export type ApprovalStatus = "pending" | "approved" | "rejected" | "shipped";

export type ApprovalImpact = {
  area: string;
  detail: string;
  risk: "low" | "medium" | "high";
};

export type ApprovalItem = {
  id: string;
  name: string;
  description: string;
  why: string;
  requestedBy: string;
  exampleGap?: string;
  impacts: ApprovalImpact[];
  defaultStatus: ApprovalStatus;
};

/** Feature proposals awaiting Justin approval before implementation. */
export const APPROVAL_ITEMS: ApprovalItem[] = [
  {
    id: "show-all-accounts",
    name: "Show all clients and accounts in Google and Meta Ads",
    description:
      "Surface every Google Ads customer and Meta ad account visible to Brandastic credentials in Dash — not only the hard-mapped clients in code/env. Operators can see unmapped accounts (e.g. Hear Christian Academy) and spot coverage gaps without leaving the app.",
    why: "Clients like Hear Christian Academy already exist in Google and/or Meta but do not appear in Dash because they are missing from the static client map. Review-only visibility of the full account inventory closes that gap.",
    requestedBy: "Jonathan Costa Junior",
    exampleGap: "Hear Christian Academy (Google + Meta)",
    impacts: [
      {
        area: "Meta Ads + Google Ads pages",
        detail:
          "Add unmapped / discovered account lists alongside current client cards. Existing mapped clients stay primary.",
        risk: "low",
      },
      {
        area: "Clients / Overview coverage",
        detail:
          "Coverage strip can flag accounts present in ads platforms but not mapped to a Dash client.",
        risk: "low",
      },
      {
        area: "Data / API load",
        detail:
          "Extra Meta Business + Google Ads customer list calls on load. Cache short TTL; still review-only (no campaign mutations).",
        risk: "medium",
      },
      {
        area: "Permissions / privacy",
        detail:
          "Only accounts already accessible to Brandastic tokens are shown. No write actions; no client-facing exposure of unrelated accounts.",
        risk: "low",
      },
    ],
    defaultStatus: "pending",
  },
  {
    id: "create-client-manual-accounts",
    name: "Create client + attach accounts (manual)",
    description:
      "New operator page to create a Dash client (name, slug, industry, domain) and manually attach Meta act IDs and Google customer IDs. Selection can be typed or picked from the discovered account list once feature 1 ships.",
    why: "Today clients are seed-mapped in code/env only. Adding Hear Christian Academy or any new account requires a deploy. A create/map UI lets the team onboard clients without a code change.",
    requestedBy: "Jonathan Costa Junior",
    exampleGap: "Hear Christian Academy — add client, attach Google + Meta accounts",
    impacts: [
      {
        area: "New page: Clients → Add / map",
        detail:
          "Form for client profile + account IDs. Validation for act_ / customer ID formats. Appears in Clients list after save.",
        risk: "medium",
      },
      {
        area: "Storage model",
        detail:
          "Move beyond static lib/clients.ts seed — persist overrides in Blob (or later DB). Seed clients remain defaults; manual maps merge on top.",
        risk: "medium",
      },
      {
        area: "Reports / SEO / logos",
        detail:
          "New clients get empty SEO domain until set; logo upload path already supports any slug. Report routes must accept dynamic clients.",
        risk: "medium",
      },
      {
        area: "Auth / safety",
        detail:
          "Team PIN only. Still review-only on ads — mapping does not enable campaign edits. Reject invalid IDs; no auto-spend actions.",
        risk: "low",
      },
      {
        area: "Depends on",
        detail:
          "Stronger with feature 1 (discovered account picker). Can ship typed IDs first if needed.",
        risk: "low",
      },
    ],
    defaultStatus: "pending",
  },
];

export function getApprovalItem(id: string) {
  return APPROVAL_ITEMS.find((i) => i.id === id);
}
