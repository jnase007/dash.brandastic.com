export type PeriodKey = "mtd" | "yoy" | "lmtd";

export type PeriodMetrics = {
  cost: number;
  impressions: number;
  clicks: number;
  cpc: number;
  searchImpShare: number | null;
  convValue: number;
};

export type ChangeSet = {
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  cpc: number | null;
  searchImpShare: number | null;
  convValue: number | null;
};

export type CampaignReview = {
  name: string;
  mtd: PeriodMetrics;
  yoy: PeriodMetrics;
  lmtd: PeriodMetrics;
  yoyChange: ChangeSet;
  momChange: ChangeSet;
  newThisYear?: boolean;
  inactive?: boolean;
};

export const DESS_WEEKLY_REVIEW = {
  clientSlug: "dess-usa",
  clientName: "DESS USA",
  title: "Google weekly review",
  periodLabel: "August 2026",
  compareYearLabel: "August 2025",
  compareMonthLabel: "July 2026",
  account: "887-752-4330",
  roas: 11.5,
  conversionValue: {
    mtd: 598535.83,
    yoy: 533979.92,
    lmtd: 711112.86,
    yoyChange: 0.1209,
    momChange: -0.3248,
  },
  totals: {
    mtd: {
      cost: 52043.97,
      impressions: 641423,
      clicks: 10256,
      cpc: 5.07,
      searchImpShare: 20.95,
      convValue: 598535.83,
    } satisfies PeriodMetrics,
    yoy: {
      cost: 30080.77,
      impressions: 546695,
      clicks: 9342,
      cpc: 3.22,
      searchImpShare: 16.83,
      convValue: 533979.92,
    } satisfies PeriodMetrics,
    lmtd: {
      cost: 52916.43,
      impressions: 801753,
      clicks: 11602,
      cpc: 4.56,
      searchImpShare: 27.79,
      convValue: 711112.86,
    } satisfies PeriodMetrics,
    yoyChange: {
      cost: 0.7301,
      impressions: 0.1733,
      clicks: 0.0978,
      cpc: 0.576,
      searchImpShare: 0.2446,
      convValue: 0.1209,
    } satisfies ChangeSet,
    momChange: {
      cost: -0.0165,
      impressions: -0.2,
      clicks: -0.116,
      cpc: 0.1126,
      searchImpShare: -0.2461,
      convValue: -0.3248,
    } satisfies ChangeSet,
  },
  campaigns: [
    {
      name: "Pmax_remarketing",
      mtd: { cost: 9029.12, impressions: 204584, clicks: 1795, cpc: 5.03, searchImpShare: 22.73, convValue: 89953.32 },
      yoy: { cost: 2492.4, impressions: 94776, clicks: 915, cpc: 2.72, searchImpShare: 20.5, convValue: 48949.11 },
      lmtd: { cost: 8911.26, impressions: 221422, clicks: 1979, cpc: 4.5, searchImpShare: 31.92, convValue: 126276.76 },
      yoyChange: { cost: 2.6227, impressions: 1.1586, clicks: 0.9617, cpc: 0.8466, searchImpShare: 0.0224, convValue: 0.8377 },
      momChange: { cost: 0.0132, impressions: -0.076, clicks: -0.093, cpc: 0.1171, searchImpShare: -0.0918, convValue: -0.2876 },
    },
    {
      name: "DESS BRAND - Brandastic",
      mtd: { cost: 7603.51, impressions: 9498, clicks: 2793, cpc: 2.72, searchImpShare: 61.46, convValue: 155558.41 },
      yoy: { cost: 6911.48, impressions: 12110, clicks: 2927, cpc: 2.36, searchImpShare: 66.56, convValue: 237838.34 },
      lmtd: { cost: 7590.88, impressions: 8623, clicks: 3089, cpc: 2.46, searchImpShare: 60.2, convValue: 226038.78 },
      yoyChange: { cost: 0.1001, impressions: -0.2157, clicks: -0.0458, cpc: 0.1529, searchImpShare: -0.0509, convValue: -0.3459 },
      momChange: { cost: 0.0017, impressions: 0.1015, clicks: -0.0958, cpc: 0.1078, searchImpShare: 0.0127, convValue: -0.3118 },
    },
    {
      name: "DG_PMax_BR - NEW",
      newThisYear: true,
      mtd: { cost: 6080.76, impressions: 114206, clicks: 1316, cpc: 4.62, searchImpShare: 13.83, convValue: 55442 },
      yoy: { cost: 0, impressions: 0, clicks: 0, cpc: 0, searchImpShare: null, convValue: 0 },
      lmtd: { cost: 6107.05, impressions: 144264, clicks: 1422, cpc: 4.29, searchImpShare: 20.14, convValue: 60663.96 },
      yoyChange: { cost: null, impressions: null, clicks: null, cpc: null, searchImpShare: null, convValue: null },
      momChange: { cost: -0.0043, impressions: -0.2084, clicks: -0.0745, cpc: 0.0759, searchImpShare: -0.063, convValue: -0.0861 },
    },
    {
      name: "DESS COMPATIBILITIES - Brandastic",
      mtd: { cost: 4969.78, impressions: 7609, clicks: 688, cpc: 7.22, searchImpShare: 17.73, convValue: 32739.43 },
      yoy: { cost: 1574.94, impressions: 6370, clicks: 543, cpc: 2.9, searchImpShare: 9.99, convValue: 23189.76 },
      lmtd: { cost: 5394.46, impressions: 9001, clicks: 848, cpc: 6.36, searchImpShare: 26.08, convValue: 61554.07 },
      yoyChange: { cost: 2.1555, impressions: 0.1945, clicks: 0.267, cpc: 1.4905, searchImpShare: 0.0774, convValue: 0.4118 },
      momChange: { cost: -0.0787, impressions: -0.1546, clicks: -0.1887, cpc: 0.1355, searchImpShare: -0.0835, convValue: -0.4681 },
    },
    {
      name: "DG_PMax_NB - NEW",
      mtd: { cost: 5453.06, impressions: 118720, clicks: 797, cpc: 6.84, searchImpShare: 25.98, convValue: 49926.88 },
      yoy: { cost: 3041.32, impressions: 82520, clicks: 966, cpc: 3.15, searchImpShare: 13.22, convValue: 58379.25 },
      lmtd: { cost: 5540.07, impressions: 131666, clicks: 828, cpc: 6.69, searchImpShare: 33.23, convValue: 66180.84 },
      yoyChange: { cost: 0.793, impressions: 0.4387, clicks: -0.1749, cpc: 1.1732, searchImpShare: 0.1276, convValue: -0.1448 },
      momChange: { cost: -0.0157, impressions: -0.0983, clicks: -0.0374, cpc: 0.0226, searchImpShare: -0.0725, convValue: -0.2456 },
    },
    {
      name: "DESS SEARCH - Brandastic",
      mtd: { cost: 4866, impressions: 14333, clicks: 608, cpc: 8, searchImpShare: 18.93, convValue: 12589.94 },
      yoy: { cost: 2006.25, impressions: 10587, clicks: 490, cpc: 4.09, searchImpShare: 11.32, convValue: 16864.38 },
      lmtd: { cost: 4863.93, impressions: 17250, clicks: 767, cpc: 6.34, searchImpShare: 23.25, convValue: 25296.13 },
      yoyChange: { cost: 1.4254, impressions: 0.3538, clicks: 0.2408, cpc: 0.9547, searchImpShare: 0.0761, convValue: -0.2535 },
      momChange: { cost: 0.0004, impressions: -0.1691, clicks: -0.2073, cpc: 0.262, searchImpShare: -0.0432, convValue: -0.5023 },
    },
    {
      name: "Dental Implants",
      mtd: { cost: 4042.23, impressions: 8594, clicks: 534, cpc: 7.57, searchImpShare: 14.49, convValue: 14470.93 },
      yoy: { cost: 2280.11, impressions: 7046, clicks: 473, cpc: 4.82, searchImpShare: 9.99, convValue: 22275.45 },
      lmtd: { cost: 4042.69, impressions: 10002, clicks: 671, cpc: 6.02, searchImpShare: 18.27, convValue: 49661.05 },
      yoyChange: { cost: 0.7728, impressions: 0.2197, clicks: 0.129, cpc: 0.5703, searchImpShare: 0.045, convValue: -0.3504 },
      momChange: { cost: -0.0001, impressions: -0.1408, clicks: -0.2042, cpc: 0.2564, searchImpShare: -0.0378, convValue: -0.7086 },
    },
    {
      name: "Pmax__lead gen",
      mtd: { cost: 4266.51, impressions: 64586, clicks: 806, cpc: 5.29, searchImpShare: 19.76, convValue: 39300.59 },
      yoy: { cost: 7228.79, impressions: 320138, clicks: 2313, cpc: 3.13, searchImpShare: 30.51, convValue: 74173.63 },
      lmtd: { cost: 4242.92, impressions: 146189, clicks: 1090, cpc: 3.89, searchImpShare: 29.74, convValue: 48051.43 },
      yoyChange: { cost: -0.4098, impressions: -0.7983, clicks: -0.6515, cpc: 0.6937, searchImpShare: -0.1076, convValue: -0.4702 },
      momChange: { cost: 0.0056, impressions: -0.5582, clicks: -0.2606, cpc: 0.3599, searchImpShare: -0.0998, convValue: -0.1821 },
    },
    {
      name: "Full Arch_PMax - NEW",
      newThisYear: true,
      mtd: { cost: 2310.98, impressions: 87225, clicks: 469, cpc: 4.93, searchImpShare: 27.04, convValue: 10153.55 },
      yoy: { cost: 0, impressions: 0, clicks: 0, cpc: 0, searchImpShare: null, convValue: 0 },
      lmtd: { cost: 2308.86, impressions: 95550, clicks: 387, cpc: 5.97, searchImpShare: 23.11, convValue: 12878.53 },
      yoyChange: { cost: null, impressions: null, clicks: null, cpc: null, searchImpShare: null, convValue: null },
      momChange: { cost: 0.0009, impressions: -0.0871, clicks: 0.2119, cpc: -0.1741, searchImpShare: 0.0393, convValue: -0.2116 },
    },
    {
      name: "DessLoc",
      mtd: { cost: 1848.46, impressions: 8954, clicks: 233, cpc: 7.93, searchImpShare: 42.5, convValue: 10552.9 },
      yoy: { cost: 1654.91, impressions: 8623, clicks: 342, cpc: 4.84, searchImpShare: 25.33, convValue: 14516.94 },
      lmtd: { cost: 2006.42, impressions: 10650, clicks: 258, cpc: 7.78, searchImpShare: 41.24, convValue: 9893.49 },
      yoyChange: { cost: 0.117, impressions: 0.0384, clicks: -0.3187, cpc: 0.6395, searchImpShare: 0.1716, convValue: -0.2731 },
      momChange: { cost: -0.0787, impressions: -0.1592, clicks: -0.0969, cpc: 0.0201, searchImpShare: 0.0125, convValue: 0.0667 },
    },
    {
      name: "Full Arch_Brandastic",
      mtd: { cost: 1573.55, impressions: 3114, clicks: 217, cpc: 7.25, searchImpShare: 36.5, convValue: 9480.25 },
      yoy: { cost: 1498.09, impressions: 2073, clicks: 218, cpc: 6.87, searchImpShare: 44.36, convValue: 31312.79 },
      lmtd: { cost: 1525.61, impressions: 3241, clicks: 243, cpc: 6.28, searchImpShare: 35.01, convValue: 22890.48 },
      yoyChange: { cost: 0.0504, impressions: 0.5022, clicks: -0.0046, cpc: 0.0552, searchImpShare: -0.0786, convValue: -0.6972 },
      momChange: { cost: 0.0314, impressions: -0.0392, clicks: -0.107, cpc: 0.155, searchImpShare: 0.0149, convValue: -0.5858 },
    },
    {
      name: "Shopping_Premilled",
      inactive: true,
      mtd: { cost: 0, impressions: 0, clicks: 0, cpc: 0, searchImpShare: null, convValue: 0 },
      yoy: { cost: 0, impressions: 0, clicks: 0, cpc: 0, searchImpShare: null, convValue: 0 },
      lmtd: { cost: 382.28, impressions: 3895, clicks: 20, cpc: 19.11, searchImpShare: 50.1, convValue: 1727.34 },
      yoyChange: { cost: 0, impressions: 0, clicks: 0, cpc: 0, searchImpShare: null, convValue: 0 },
      momChange: { cost: -1, impressions: -1, clicks: -1, cpc: -1, searchImpShare: null, convValue: -1 },
    },
  ] satisfies CampaignReview[],
} as const;

export function roas(cost: number, value: number) {
  if (!cost) return null;
  return value / cost;
}
