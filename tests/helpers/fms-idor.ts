import { PrismaClient } from "@prisma/client";

/** Look up an FMS job in another tenant for IDOR tests. Returns null if none exist. */
export async function findForeignFmsInstanceId(excludeOrgSlug: string) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }

  const prisma = new PrismaClient();
  try {
    const row = await prisma.fmsInstance.findFirst({
      where: {
        organization: { slug: { not: excludeOrgSlug } },
      },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch {
    return null;
  } finally {
    await prisma.$disconnect();
  }
}
