import { prisma } from "@/lib/db";

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

  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
