import type { ClientAccount } from "./types";

/**
 * Seed client map for Brandastic ads review.
 * Wire real Meta act_ IDs / Google customer IDs as Jonathan shares them.
 * IDs can also be provided via env later without code changes.
 */
export const CLIENTS: ClientAccount[] = [
  {
    id: "brandastic",
    name: "Brandastic",
    slug: "brandastic",
    industry: "Agency / House",
    metaAccountId: process.env.META_ACT_BRANDASTIC || "",
    googleCustomerId: process.env.GADS_BRANDASTIC || "",
    status: "active",
  },
  {
    id: "friar-tux",
    name: "Friar Tux",
    slug: "friar-tux",
    industry: "Formalwear",
    metaAccountId: process.env.META_ACT_FRIAR_TUX || "",
    googleCustomerId: process.env.GADS_FRIAR_TUX || "",
    status: "active",
  },
  {
    id: "dess-usa",
    name: "DESS USA",
    slug: "dess-usa",
    industry: "Dental Equipment",
    metaAccountId: process.env.META_ACT_DESS || "",
    googleCustomerId: process.env.GADS_DESS || "",
    status: "active",
  },
  {
    id: "nordic-sauna",
    name: "Nordic Sauna",
    slug: "nordic-sauna",
    industry: "Wellness / Sauna",
    metaAccountId: process.env.META_ACT_NORDIC || "",
    googleCustomerId: process.env.GADS_NORDIC || "",
    status: "active",
  },
  {
    id: "cini-sauce",
    name: "Cini Sauce",
    slug: "cini-sauce",
    industry: "CPG / Food",
    metaAccountId: process.env.META_ACT_CINI || "",
    googleCustomerId: process.env.GADS_CINI || "",
    status: "active",
  },
  {
    id: "adopt-a-highway",
    name: "Adopt a Highway",
    slug: "adopt-a-highway",
    industry: "Nonprofit / Cause",
    metaAccountId: process.env.META_ACT_AAH || "",
    googleCustomerId: process.env.GADS_AAH || "",
    status: "active",
  },
  {
    id: "atomic-horseradish",
    name: "Atomic Horseradish",
    slug: "atomic-horseradish",
    industry: "CPG / Food",
    metaAccountId: process.env.META_ACT_ATOMIC || "",
    googleCustomerId: process.env.GADS_ATOMIC || "",
    status: "setup",
  },
  {
    id: "ch-pm",
    name: "CH-PM / HOAME",
    slug: "ch-pm",
    industry: "Property Management",
    metaAccountId: process.env.META_ACT_CHPM || "",
    googleCustomerId: process.env.GADS_CHPM || "",
    status: "setup",
  },
];

export function getClient(slug: string) {
  return CLIENTS.find((c) => c.slug === slug || c.id === slug);
}
