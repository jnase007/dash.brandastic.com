import type { ClientAccount } from "./types";

/**
 * Brandastic ads + SEO review roster.
 * Seed clients + live Meta token acts + Google MCC ENABLED children (2026-07-23).
 * Env overrides still win when set (META_ACT_* / GADS_* / SEO_DOMAIN_*).
 * Skipped: Google CANCELED/CLOSED/SUSPENDED, test accounts, duplicate secondary acts.
 * Optional metaAccountIds / googleCustomerIds hold extras. Pulls use the
 * de-duped union with the primary. Do not invent second IDs.
 */
const ROSTER: ClientAccount[] = [
  {
    id: "brandastic",
    name: "Brandastic",
    slug: "brandastic",
    industry: "Agency / House",
    domain: process.env.SEO_DOMAIN_BRANDASTIC || "brandastic.com",
    metaAccountId: process.env.META_ACT_BRANDASTIC || "act_10499403",
    googleCustomerId: process.env.GADS_BRANDASTIC || "6921457333",
    status: "active",
  },
  {
    id: "friar-tux",
    name: "Friar Tux",
    slug: "friar-tux",
    industry: "Formalwear",
    domain: process.env.SEO_DOMAIN_FRIAR_TUX || "friartux.com",
    metaAccountId: process.env.META_ACT_FRIAR_TUX || "act_2043355672411759",
    googleCustomerId: process.env.GADS_FRIAR_TUX || "",
    status: "active",
  },
  {
    id: "dess-usa",
    name: "DESS USA",
    slug: "dess-usa",
    industry: "Dental Equipment",
    domain: process.env.SEO_DOMAIN_DESS || "dess-usa.com",
    metaAccountId: process.env.META_ACT_DESS || "act_2333256420250385",
    googleCustomerId: process.env.GADS_DESS || "8877524330",
    status: "active",
  },
  {
    id: "nordic-sauna",
    name: "Nordic Sauna",
    slug: "nordic-sauna",
    industry: "Wellness / Sauna",
    domain: process.env.SEO_DOMAIN_NORDIC || "nordicsauna.com",
    metaAccountId: process.env.META_ACT_NORDIC || "",
    googleCustomerId: process.env.GADS_NORDIC || "2511043517",
    status: "active",
  },
  {
    id: "cini-sauce",
    name: "Cini Sauce",
    slug: "cini-sauce",
    industry: "CPG / Food",
    domain: process.env.SEO_DOMAIN_CINI || "cinisauce.com",
    metaAccountId: process.env.META_ACT_CINI || "act_1243985350229509",
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
    domain: process.env.SEO_DOMAIN_ATOMIC || "atomichorseradish.com",
    metaAccountId: process.env.META_ACT_ATOMIC || "",
    googleCustomerId: process.env.GADS_ATOMIC || "",
    status: "setup",
  },
  {
    id: "ch-pm",
    name: "CH-PM / Crummack",
    slug: "ch-pm",
    industry: "Property Management",
    domain: process.env.SEO_DOMAIN_CHPM || "ch-pm.com",
    metaAccountId: process.env.META_ACT_CHPM || "act_105843410666921",
    googleCustomerId: process.env.GADS_CHPM || "1690254897",
    status: "active",
  },
  {
    id: "heart-christian-academy",
    name: "Heart Christian Academy",
    slug: "heart-christian-academy",
    industry: "Education",
    domain: process.env.SEO_DOMAIN_HEART_CHRISTIAN_ACADEMY || "heartchristianacademy.com",
    metaAccountId: process.env.META_ACT_HEART_CHRISTIAN_ACADEMY || "act_52289506",
    googleCustomerId: process.env.GADS_HEART_CHRISTIAN_ACADEMY || "4776668598",
    status: "active",
  },
  {
    id: "rogers-beltran",
    name: "Rogers Beltran",
    slug: "rogers-beltran",
    industry: "Legal",
    domain: process.env.SEO_DOMAIN_ROGERS_BELTRAN || "rogersbeltran.com",
    metaAccountId: process.env.META_ACT_ROGERS_BELTRAN || "",
    googleCustomerId: process.env.GADS_ROGERS_BELTRAN || "2907325400",
    status: "active",
  },
  {
    id: "calops",
    name: "CalOPS",
    slug: "calops",
    industry: "Education / Ops",
    domain: process.env.SEO_DOMAIN_CALOPS || "calops.org",
    metaAccountId: process.env.META_ACT_CALOPS || "",
    googleCustomerId: process.env.GADS_CALOPS || "9121351564",
    status: "active",
  },
  {
    id: "ryvid",
    name: "Ryvid",
    slug: "ryvid",
    industry: "EV / Mobility",
    domain: process.env.SEO_DOMAIN_RYVID || "ryvid.com",
    metaAccountId: process.env.META_ACT_RYVID || "act_687891252633665",
    googleCustomerId: process.env.GADS_RYVID || "7652480219",
    status: "active",
  },
  {
    id: "topgreener",
    name: "TOPGREENER",
    slug: "topgreener",
    industry: "Electrical / CPG",
    domain: process.env.SEO_DOMAIN_TOPGREENER || "topgreener.com",
    metaAccountId: process.env.META_ACT_TOPGREENER || "act_367557830071188",
    googleCustomerId: process.env.GADS_TOPGREENER || "3848242463",
    status: "active",
  },
  {
    id: "wearparts",
    name: "Wearparts",
    slug: "wearparts",
    industry: "Agriculture / Parts",
    domain: process.env.SEO_DOMAIN_WEARPARTS || "wearpartstillage.com",
    metaAccountId: process.env.META_ACT_WEARPARTS || "act_813227754438556",
    googleCustomerId: process.env.GADS_WEARPARTS || "7798794194",
    status: "active",
  },
  {
    id: "prudental-lab",
    name: "Prudental Lab",
    slug: "prudental-lab",
    industry: "Dental Lab",
    domain: process.env.SEO_DOMAIN_PRUDENTAL_LAB || "prudental.com",
    metaAccountId: process.env.META_ACT_PRUDENTAL_LAB || "act_203368620217386",
    googleCustomerId: process.env.GADS_PRUDENTAL_LAB || "4529620394",
    status: "active",
  },
  {
    id: "ocie-sbdc",
    name: "OCIE SBDC",
    slug: "ocie-sbdc",
    industry: "Economic Development",
    domain: process.env.SEO_DOMAIN_OCIE_SBDC || "ocie.org",
    metaAccountId: process.env.META_ACT_OCIE_SBDC || "act_578082183827064",
    googleCustomerId: process.env.GADS_OCIE_SBDC || "4991404330",
    status: "active",
  },
  {
    id: "salvin-dental",
    name: "Salvin Dental",
    slug: "salvin-dental",
    industry: "Dental",
    domain: process.env.SEO_DOMAIN_SALVIN_DENTAL || "salvin.com",
    metaAccountId: process.env.META_ACT_SALVIN_DENTAL || "",
    googleCustomerId: process.env.GADS_SALVIN_DENTAL || "9741564346",
    status: "active",
  },
  {
    id: "preat",
    name: "Preat",
    slug: "preat",
    industry: "Dental",
    domain: process.env.SEO_DOMAIN_PREAT || "preat.com",
    metaAccountId: process.env.META_ACT_PREAT || "",
    googleCustomerId: process.env.GADS_PREAT || "4362719704",
    status: "active",
  },
  {
    id: "labtech",
    name: "LabTech",
    slug: "labtech",
    industry: "Dental Lab",
    domain: process.env.SEO_DOMAIN_LABTECH || "",
    metaAccountId: process.env.META_ACT_LABTECH || "",
    googleCustomerId: process.env.GADS_LABTECH || "7854086102",
    status: "active",
  },
  {
    id: "lee-partners-law",
    name: "Lee Partners Law",
    slug: "lee-partners-law",
    industry: "Legal",
    domain: process.env.SEO_DOMAIN_LEE_PARTNERS_LAW || "",
    metaAccountId: process.env.META_ACT_LEE_PARTNERS_LAW || "",
    googleCustomerId: process.env.GADS_LEE_PARTNERS_LAW || "6455390345",
    status: "active",
  },
  {
    id: "oc-construction",
    name: "OC Construction & Consulting",
    slug: "oc-construction",
    industry: "Construction",
    domain: process.env.SEO_DOMAIN_OC_CONSTRUCTION || "",
    metaAccountId: process.env.META_ACT_OC_CONSTRUCTION || "",
    googleCustomerId: process.env.GADS_OC_CONSTRUCTION || "6505164133",
    status: "active",
  },
  {
    id: "gigx",
    name: "GigX",
    slug: "gigx",
    industry: "Technology",
    domain: process.env.SEO_DOMAIN_GIGX || "",
    metaAccountId: process.env.META_ACT_GIGX || "",
    googleCustomerId: process.env.GADS_GIGX || "2254825770",
    status: "active",
  },
  {
    id: "young-surgical",
    name: "Young Surgical",
    slug: "young-surgical",
    industry: "Medical",
    domain: process.env.SEO_DOMAIN_YOUNG_SURGICAL || "",
    metaAccountId: process.env.META_ACT_YOUNG_SURGICAL || "",
    googleCustomerId: process.env.GADS_YOUNG_SURGICAL || "8838250231",
    status: "active",
  },
  {
    id: "mono-b",
    name: "Mono B",
    slug: "mono-b",
    industry: "Brand",
    domain: process.env.SEO_DOMAIN_MONO_B || "",
    metaAccountId: process.env.META_ACT_MONO_B || "",
    googleCustomerId: process.env.GADS_MONO_B || "5111251647",
    status: "active",
  },
  {
    id: "resintops",
    name: "ResinTops",
    slug: "resintops",
    industry: "Surfaces",
    domain: process.env.SEO_DOMAIN_RESINTOPS || "resintops.net",
    metaAccountId: process.env.META_ACT_RESINTOPS || "",
    googleCustomerId: process.env.GADS_RESINTOPS || "2357462690",
    status: "active",
  },
  {
    id: "1billion-org",
    name: "1Billion.org",
    slug: "1billion-org",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_1BILLION_ORG || "",
    metaAccountId: process.env.META_ACT_1BILLION_ORG || "act_14361207",
    googleCustomerId: process.env.GADS_1BILLION_ORG || "",
    status: "active",
  },
  {
    id: "faust-harrison-pianos",
    name: "Faust Harrison Pianos",
    slug: "faust-harrison-pianos",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_FAUST_HARRISON_PIANOS || "",
    metaAccountId: process.env.META_ACT_FAUST_HARRISON_PIANOS || "act_199147930196540",
    googleCustomerId: process.env.GADS_FAUST_HARRISON_PIANOS || "",
    status: "active",
  },
  {
    id: "posture-pump",
    name: "Posture Pump",
    slug: "posture-pump",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_POSTURE_PUMP || "",
    metaAccountId: process.env.META_ACT_POSTURE_PUMP || "act_501386239990191",
    googleCustomerId: process.env.GADS_POSTURE_PUMP || "",
    status: "active",
  },
  {
    id: "jim-johnson",
    name: "Jim Johnson",
    slug: "jim-johnson",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_JIM_JOHNSON || "",
    metaAccountId: process.env.META_ACT_JIM_JOHNSON || "act_114378612702881",
    googleCustomerId: process.env.GADS_JIM_JOHNSON || "",
    status: "active",
  },
  {
    id: "alliance-portfolio",
    name: "Alliance Portfolio",
    slug: "alliance-portfolio",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_ALLIANCE_PORTFOLIO || "",
    metaAccountId: process.env.META_ACT_ALLIANCE_PORTFOLIO || "act_101157424027324",
    googleCustomerId: process.env.GADS_ALLIANCE_PORTFOLIO || "",
    status: "active",
  },
  {
    id: "pastor-jordan",
    name: "Pastor Jordan",
    slug: "pastor-jordan",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_PASTOR_JORDAN || "",
    metaAccountId: process.env.META_ACT_PASTOR_JORDAN || "act_416591655854229",
    googleCustomerId: process.env.GADS_PASTOR_JORDAN || "",
    status: "active",
  },
  {
    id: "scientific-animations-usa",
    name: "Scientific Animations USA",
    slug: "scientific-animations-usa",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_SCIENTIFIC_ANIMATIONS_USA || "",
    metaAccountId: process.env.META_ACT_SCIENTIFIC_ANIMATIONS_USA || "act_2645656655653091",
    googleCustomerId: process.env.GADS_SCIENTIFIC_ANIMATIONS_USA || "",
    status: "active",
  },
  {
    id: "osi-express",
    name: "OSI Express",
    slug: "osi-express",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_OSI_EXPRESS || "",
    metaAccountId: process.env.META_ACT_OSI_EXPRESS || "act_847324125754527",
    googleCustomerId: process.env.GADS_OSI_EXPRESS || "",
    status: "active",
  },
  {
    id: "jilaine-swim",
    name: "Jilaine Swim",
    slug: "jilaine-swim",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_JILAINE_SWIM || "",
    metaAccountId: process.env.META_ACT_JILAINE_SWIM || "act_1271612189905130",
    googleCustomerId: process.env.GADS_JILAINE_SWIM || "",
    status: "active",
  },
  {
    id: "orangetheory-oc-sd-sf-regional",
    name: "Orangetheory OC SD SF Regional",
    slug: "orangetheory-oc-sd-sf-regional",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_ORANGETHEORY_OC_SD_SF_REGIONAL || "",
    metaAccountId: process.env.META_ACT_ORANGETHEORY_OC_SD_SF_REGIONAL || "act_245003400764420",
    googleCustomerId: process.env.GADS_ORANGETHEORY_OC_SD_SF_REGIONAL || "",
    status: "active",
  },
  {
    id: "gellydrops",
    name: "GELLYDROPS",
    slug: "gellydrops",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_GELLYDROPS || "",
    metaAccountId: process.env.META_ACT_GELLYDROPS || "act_379526597551938",
    googleCustomerId: process.env.GADS_GELLYDROPS || "",
    status: "active",
  },
  {
    id: "starboard-realty",
    name: "Starboard Realty",
    slug: "starboard-realty",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_STARBOARD_REALTY || "",
    metaAccountId: process.env.META_ACT_STARBOARD_REALTY || "act_3166795467042458",
    googleCustomerId: process.env.GADS_STARBOARD_REALTY || "",
    status: "active",
  },
  {
    id: "pauls-life-lessons",
    name: "Pauls Life Lessons",
    slug: "pauls-life-lessons",
    industry: "Ads account",
    domain: process.env.SEO_DOMAIN_PAULS_LIFE_LESSONS || "",
    metaAccountId: process.env.META_ACT_PAULS_LIFE_LESSONS || "act_2129956134079615",
    googleCustomerId: process.env.GADS_PAULS_LIFE_LESSONS || "",
    status: "active",
  },
];

export function normalizeMetaAct(id: string) {
  const raw = String(id || "").trim();
  if (!raw) return "";
  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

export function normalizeGoogleCustomerId(id: string) {
  return String(id || "").replace(/-/g, "").trim();
}

function uniqueIds(ids: Array<string | undefined>, normalize: (id: string) => string) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const norm = normalize(id || "");
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

export function clientMetaAccountIds(client: Pick<ClientAccount, "metaAccountId" | "metaAccountIds">) {
  return uniqueIds([client.metaAccountId, ...(client.metaAccountIds || [])], normalizeMetaAct);
}

export function clientGoogleCustomerIds(
  client: Pick<ClientAccount, "googleCustomerId" | "googleCustomerIds">
) {
  return uniqueIds(
    [client.googleCustomerId, ...(client.googleCustomerIds || [])],
    normalizeGoogleCustomerId
  );
}

export function clientHasMeta(client: Pick<ClientAccount, "metaAccountId" | "metaAccountIds">) {
  return clientMetaAccountIds(client).length > 0;
}

export function clientHasGoogle(
  client: Pick<ClientAccount, "googleCustomerId" | "googleCustomerIds">
) {
  return clientGoogleCustomerIds(client).length > 0;
}

export function clientPrimaryMetaAccountId(
  client: Pick<ClientAccount, "metaAccountId" | "metaAccountIds">
) {
  return normalizeMetaAct(client.metaAccountId || "") || clientMetaAccountIds(client)[0] || "";
}

export function clientOwnsAccount(
  client: ClientAccount,
  platform: "meta" | "google",
  id: string
) {
  if (!id) return false;
  return platform === "meta"
    ? clientMetaAccountIds(client).includes(normalizeMetaAct(id))
    : clientGoogleCustomerIds(client).includes(normalizeGoogleCustomerId(id));
}

function withRosterDefaults(client: ClientAccount): ClientAccount {
  const mapped = clientHasMeta(client) || clientHasGoogle(client);
  if (client.status === "active" && mapped && !client.primaryResult) {
    return { ...client, primaryResult: "leads" };
  }
  return client;
}

export const CLIENTS: ClientAccount[] = ROSTER.map(withRosterDefaults);

export function getClient(slug: string) {
  return CLIENTS.find((c) => c.slug === slug || c.id === slug);
}

export function getClientByMappedAccount(platform: "meta" | "google", id: string) {
  const needle = String(id || "");
  if (!needle) return undefined;
  return CLIENTS.find((c) => clientOwnsAccount(c, platform, needle));
}

export function listClients() {
  return CLIENTS;
}
