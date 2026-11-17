export type TeamMember = {
  name: string;
  role: string;
  image: string;
};

/** Real brandastic.co Team Hub avatars (spinning login faces) */
export const TEAM: TeamMember[] = [
  {
    name: "Justin Nase",
    role: "Founder / President",
    image: "/team/co-justin.jpg",
  },
  {
    name: "Sandy Ortiz",
    role: "Operations",
    image: "/team/co-sandy.jpg",
  },
  {
    name: "Melissa Hatch",
    role: "Marketing",
    image: "/team/co-melissa.jpg",
  },
  {
    name: "Maxwell Gilbert",
    role: "Email / Copy",
    image: "/team/co-maxwell.png",
  },
  {
    name: "Erin Clancy",
    role: "Account / Ops",
    image: "/team/co-erin.jpg",
  },
  {
    name: "Jordan Nase",
    role: "Team",
    image: "/team/co-jordan.jpg",
  },
];

export const CLIENT_BRAND: Record<
  string,
  { accent: string; accentSoft: string; monogram: string }
> = {
  brandastic: {
    accent: "#0644ed",
    accentSoft: "rgba(6, 68, 237, 0.10)",
    monogram: "B",
  },
  "friar-tux": {
    accent: "#1f2937",
    accentSoft: "rgba(31, 41, 55, 0.10)",
    monogram: "FT",
  },
  "dess-usa": {
    accent: "#0ea5e9",
    accentSoft: "rgba(14, 165, 233, 0.12)",
    monogram: "D",
  },
  "nordic-sauna": {
    accent: "#0f766e",
    accentSoft: "rgba(15, 118, 110, 0.12)",
    monogram: "NS",
  },
  "cini-sauce": {
    accent: "#dc2626",
    accentSoft: "rgba(220, 38, 38, 0.12)",
    monogram: "CS",
  },
  "adopt-a-highway": {
    accent: "#16a34a",
    accentSoft: "rgba(22, 163, 74, 0.12)",
    monogram: "AAH",
  },
  "ch-pm": {
    accent: "#4f46e5",
    accentSoft: "rgba(79, 70, 229, 0.12)",
    monogram: "CH",
  },
  "heart-christian-academy": {
    accent: "#7c3aed",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "HCA",
  },
  "rogers-beltran": {
    accent: "#0f172a",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "RB",
  },
  "calops": {
    accent: "#0284c7",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "CO",
  },
  "ryvid": {
    accent: "#111827",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "RY",
  },
  "topgreener": {
    accent: "#15803d",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "TG",
  },
  "wearparts": {
    accent: "#b45309",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "WP",
  },
  "ocie-sbdc": {
    accent: "#1d4ed8",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "OC",
  },
  "salvin-dental": {
    accent: "#0e7490",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "SD",
  },
  "labtech": {
    accent: "#475569",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "LT",
  },
  "lee-partners-law": {
    accent: "#1e3a8a",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "LP",
  },
  "oc-construction": {
    accent: "#c2410c",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "OCC",
  },
  "gigx": {
    accent: "#db2777",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "GX",
  },
  "young-surgical": {
    accent: "#0f766e",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "YS",
  },
  "mono-b": {
    accent: "#18181b",
    accentSoft: "rgba(0, 0, 0, 0.08)",
    monogram: "MB",
  },
};

export function clientBrand(slug: string) {
  return (
    CLIENT_BRAND[slug] || {
      accent: "#0644ed",
      accentSoft: "rgba(6, 68, 237, 0.10)",
      monogram: slug.slice(0, 2).toUpperCase(),
    }
  );
}
