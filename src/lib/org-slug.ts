import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import {
  ANMOL_PORTAL_SLUG,
  HINGORANI_PORTAL_SLUG,
} from "@/lib/dedicated-client-portals";

const RESERVED_ORG_SLUGS = new Set([
  PRIMARY_ORG_SLUG,
  HINGORANI_PORTAL_SLUG,
  ANMOL_PORTAL_SLUG,
  "anmol",
  "sheetomatic",
  "tops",
  "app",
  "workspace",
  "ai",
  "www",
  "login",
  "admin",
  "api",
  "learn",
  "mail",
  "cdn",
  "app-builder",
]);

export function isReservedOrganizationSlug(slug: string) {
  return RESERVED_ORG_SLUGS.has(slug.trim().toLowerCase());
}

export function slugifyOrganizationName(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "workspace";
}

export async function createUniqueOrganizationSlug(name: string) {
  const base = slugifyOrganizationName(name);
  let slug = base;
  let suffix = 0;

  while (
    isReservedOrganizationSlug(slug) ||
    (await prisma.organization.findUnique({ where: { slug } }))
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
