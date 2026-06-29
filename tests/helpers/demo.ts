/** Demo credentials from `prisma/seed.ts` — requires `npm run db:seed` before authenticated E2E. */
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ORGS = {
  acme: "acme-manufacturing",
  bakery: "sunrise-bakery",
  hingorani: "hingorani",
  sheetomatic: "sheetomatic-technologies",
} as const;

export const DEMO_USERS = {
  acmeOwner: "owner@acme.demo",
  acmeViewer: "viewer@acme.demo",
  bakeryOwner: "owner@bakery.demo",
  multiOrgConsultant: "consultant@demo.sheetomatic.com",
  founder: "founder@sheetomatic.com",
} as const;

/** Task titles unique to a single tenant in seed data. */
export const TENANT_MARKERS = {
  acme: "Follow up quotation #1842",
  bakery: "End-of-day stock count",
} as const;
