import bcrypt from "bcryptjs";
import { withDbRetry } from "@/lib/db";

export type OrgOption = {
  slug: string;
  name: string;
  role: string;
  isPrimary?: boolean;
};

export async function resolveOrganizationsForCredentials(
  email: string,
  password: string,
): Promise<OrgOption[] | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await withDbRetry((db) =>
    db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  );

  if (!user?.passwordHash) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  if (user.isSuperAdmin) {
    const organizations = await withDbRetry((db) =>
      db.organization.findMany({
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      }),
    );

    return organizations.map((organization) => ({
      slug: organization.slug,
      name: organization.name,
      role: "SUPER_ADMIN",
      isPrimary: organization.isPrimary,
    }));
  }

  return user.memberships.map((membership) => ({
    slug: membership.organization.slug,
    name: membership.organization.name,
    role: membership.role,
  }));
}

export async function listOrganizationsForUser(userId: string) {
  const user = await withDbRetry((db) =>
    db.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    }),
  );

  if (user?.isSuperAdmin) {
    const organizations = await withDbRetry((db) =>
      db.organization.findMany({
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      }),
    );

    return organizations.map((organization) => ({
      slug: organization.slug,
      name: organization.name,
      role: "SUPER_ADMIN",
      isPrimary: organization.isPrimary,
    }));
  }

  const memberships = await withDbRetry((db) =>
    db.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
  );

  return memberships.map((membership) => ({
    slug: membership.organization.slug,
    name: membership.organization.name,
    role: membership.role,
  }));
}
