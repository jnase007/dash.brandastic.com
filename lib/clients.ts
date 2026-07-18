import type { ClientAccount } from "./types";

/**
 * Seed client map for Brandastic ads + SEO review.
 * Wire real Meta act_ IDs / Google customer IDs / SEO domains as available.
 * IDs can also be provided via env later without code changes.
 */
export const CLIENTS: ClientAccount[] = [
  {
    id: "brandastic",
    name: "Brandastic",
    slug: "brandastic",
    industry: "Agency / House",
    domain: process.env.SEO_DOMAIN_BRANDASTIC || "brandastic.com",
    metaAccountId: process.env.META_ACT_BRANDASTIC || "",
    googleCustomerId: process.env.GADS_BRANDASTIC || "",
    status: "active",
  },
  {
    id: "friar-tux",
    name: "Friar Tux",
    slug: "friar-tux",
    industry: "Formalwear",
    domain: process.env.SEO_DOMAIN_FRIAR_TUX || "friartux.com",
    metaAccountId: process.env.META_ACT_FRIAR_TUX || "",
    googleCustomerId: process.env.GADS_FRIAR_TUX || "",
    status: "active",
  },
  {
    id: "dess-usa",
    name: "DESS USA",
    slug: "dess-usa",
    industry: "Dental Equipment",
    domain: process.env.SEO_DOMAIN_DESS || "dess-usa.com",
    metaAccountId: process.env.META_ACT_DESS || "",
    googleCustomerId: process.env.GADS_DESS || "",
    status: "active",
  },
  {
    id: "nordic-sauna",
    name: "Nordic Sauna",
    slug: "nordic-sauna",
    industry: "Wellness / Sauna",
    domain: process.env.SEO_DOMAIN_NORDIC || "nordicsauna.com",
    metaAccountId: process.env.META_ACT_NORDIC || "",
    googleCustomerId: process.env.GADS_NORDIC || "",
    status: "active",
  },
  {
    id: "cini-sauce",
    name: "Cini Sauce",
    slug: "cini-sauce",
    industry: "CPG / Food",
    domain: process.env.SEO_DOMAIN_CINI || "cinisauce.com",
    metaAccountId: process.env.META_ACT_CINI || "",
    googleCustomerId: process.env.GADS_CINI || "",
    status: "active",
  },
  {
    id: "adopt-a-highway",
    name: "Adopt a Highway",
    slug: "adopt-a-highway",
    industry: "Nonprofit / Cause",
    domain: process.env.SEO_DOMAIN_AAH || "adoptahighway.com",
    metaAccountId: process.env.META_ACT_AAH || "",
    googleCustomerId: process.env.GADS_AAH || "",
    status: "active",
  },
  {
    id: "atomic-horseradish",
    name: "Atomic Horseradish",
    slug: "atomic-horseradish",
    industry: "CPG / Food",
    // Product lives under Morehouse Foods; override via SEO_DOMAIN_ATOMIC if needed.
    domain: process.env.SEO_DOMAIN_ATOMIC || "morehousefoods.com",
    metaAccountId: process.env.META_ACT_ATOMIC || "",
    googleCustomerId: process.env.GADS_ATOMIC || "",
    status: "setup",
  },
  {
    id: "ch-pm",
    name: "CH-PM / HOAME",
    slug: "ch-pm",
    industry: "Property Management",
    domain: process.env.SEO_DOMAIN_CHPM || "ch-pm.com",
    metaAccountId: process.env.META_ACT_CHPM || "",
    googleCustomerId: process.env.GADS_CHPM || "",
    status: "setup",
  },
];

export function getClient(slug: string) {
  return CLIENTS.find((c) => c.slug === slug || c.id === slug);
}
