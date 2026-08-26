/** Why Sheetomatic App Builder — AppSheet power + Glide screens, one product. */

export const APP_BUILDER_USP_LINE =
  "AppSheet power. Glide screens. Your Gmail Sheet.";

export const APP_BUILDER_USP_WHY =
  "Formulas, refs, bots, and PDFs like AppSheet. Phone, tablet, and desktop that look like Glide. Staff open a link and PIN — no Workspace seat, no Marketplace.";

export type UspSide = "appsheet" | "glide" | "us";

export type UspRow = {
  feature: string;
  appsheet: string;
  glide: string;
  us: string;
};

/** What we take from each, and what only we do. */
export const APP_BUILDER_USP_ROWS: UspRow[] = [
  {
    feature: "Formulas & virtual columns",
    appsheet: "Full expression language",
    glide: "Limited computed",
    us: "AppSheet [Col] formulas + virtuals on the Sheet",
  },
  {
    feature: "Refs, Enum, File folders",
    appsheet: "Yes",
    glide: "Relations, not AppSheet types",
    us: "Enum, Ref, File folder > file",
  },
  {
    feature: "Bots, PDF, WhatsApp, email",
    appsheet: "Bots + PDF + email",
    glide: "Actions, weaker automation",
    us: "Bots + PDF + WA + email scripts",
  },
  {
    feature: "View types",
    appsheet: "Table, deck, gallery, calendar…",
    glide: "Collections, not AppSheet names",
    us: "AppSheet view types on Glide-style screens",
  },
  {
    feature: "Looks like a real phone app",
    appsheet: "Functional, dated",
    glide: "Best-in-class",
    us: "Themes, cards, photos, icons — Glide feel",
  },
  {
    feature: "Computed without Sheet formulas",
    appsheet: "Virtuals in the app",
    glide: "Lookup, math, if-then",
    us: "Both: lookup/math/if + AppSheet formula",
  },
  {
    feature: "Who sees what / actions",
    appsheet: "Security filters",
    glide: "Visibility + button sequences",
    us: "Owner/staff hide + one-tap actions",
  },
  {
    feature: "Users without Gmail",
    appsheet: "Needs a Google account",
    glide: "App users",
    us: "PIN staff — no Workspace seat",
  },
  {
    feature: "Data home",
    appsheet: "Workspace Sheet / Cloud SQL",
    glide: "Glide Tables or Sheet",
    us: "Gmail Sheet or upload — ₹0 to Google",
  },
  {
    feature: "Phone + tablet + desktop",
    appsheet: "Mostly phone",
    glide: "Phone-first",
    us: "Preview all three in the studio",
  },
];

export const APP_BUILDER_USP_PILLARS = [
  {
    id: "appsheet" as const,
    title: "From AppSheet",
    items: [
      "Formulas and virtual columns",
      "Reference, Enum, File",
      "Bots, PDF, scripts",
      "Table / deck / gallery / calendar / chart",
    ],
  },
  {
    id: "glide" as const,
    title: "From Glide",
    items: [
      "Phone home that looks finished",
      "Lookup, math, if-then",
      "Visibility and action buttons",
      "Photos, themes, relations",
    ],
  },
  {
    id: "us" as const,
    title: "Only here",
    items: [
      "Gmail Sheet — no Workspace bill",
      "Staff PIN, not a Google seat",
      "WhatsApp from the same bot as PDF",
      "Phone, tablet, and desktop preview",
    ],
  },
];
