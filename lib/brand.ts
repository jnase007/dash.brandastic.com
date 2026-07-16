export type TeamMember = {
  name: string;
  role: string;
  image: string;
};

/** Real Brandastic.com team portraits */
export const TEAM: TeamMember[] = [
  {
    name: "Justin Nase",
    role: "Founder / President",
    image: "/team/justin-portrait.webp",
  },
  {
    name: "Sandy Ortiz",
    role: "Operations",
    image: "/team/sandy.png",
  },
  {
    name: "Melissa Hatch",
    role: "Marketing",
    image: "/team/melissa.png",
  },
  {
    name: "Maxwell Gilbert",
    role: "Email / Copy",
    image: "/team/maxwell.png",
  },
  {
    name: "Stacy",
    role: "Team",
    image: "/team/stacy.png",
  },
  {
    name: "Megan Hahn",
    role: "Team",
    image: "/team/megan.png",
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
    monogram: "AH",
  },
  "atomic-horseradish": {
    accent: "#ea580c",
    accentSoft: "rgba(234, 88, 12, 0.12)",
    monogram: "AH",
  },
  "ch-pm": {
    accent: "#4f46e5",
    accentSoft: "rgba(79, 70, 229, 0.12)",
    monogram: "CH",
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
