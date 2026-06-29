import { prisma } from "@/lib/db";

export type PendingWorkspaceSignup = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  createdAt: Date;
};

/** Workspaces awaiting super-admin activation after self-serve signup. */
export async function listPendingWorkspaceSignups(): Promise<
  PendingWorkspaceSignup[]
> {
  const rows = await prisma.organization.findMany({
    where: {
      status: "ONBOARDING",
      isPrimary: false,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      memberships: {
        where: { role: "OWNER" },
        take: 1,
        select: { user: { select: { email: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    ownerEmail: row.memberships[0]?.user.email ?? null,
  }));
}
