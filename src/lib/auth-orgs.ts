import bcrypt from "bcryptjs";
import { withDbRetry } from "@/lib/db";

export type OrgOption = {
  slug: string;
  name: string;
  role: string;
  isPrimary?: boolean;
};

const orgListSelect = {
  slug: true,
  name: true,
  isPrimary: true,
} as const;

const membershipOrgSelect = {
  slug: true,
  name: true,
  status: true,
} as const;

type MembershipOrgRow = {
  role: string;
  organization: {
    slug: string;
    name: string;
    status: string;
  };
};

function optionsFromMemberships(memberships: MembershipOrgRow[]): OrgOption[] {
  return memberships
    .filter(
      (membership) =>
        membership.organization.status === "ACTIVE" ||
        membership.organization.status === "ONBOARDING",
    )
    .map((membership) => ({
      slug: membership.organization.slug,
      name: membership.organization.name,
      role: membership.role,
    }));
}

function optionsFromOrganizations(
  organizations: Array<{ slug: string; name: string; isPrimary: boolean }>,
): OrgOption[] {
  return organizations.map((organization) => ({
    slug: organization.slug,
    name: organization.name,
    role: "SUPER_ADMIN",
    isPrimary: organization.isPrimary,
  }));
}

async function listAllOrganizationsForSuperAdmin(): Promise<OrgOption[]> {
  const organizations = await withDbRetry((db) =>
    db.organization.findMany({
      select: orgListSelect,
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    }),
  );
  return optionsFromOrganizations(organizations);
}

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
      select: {
        passwordHash: true,
        isSuperAdmin: true,
        memberships: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            organization: { select: membershipOrgSelect },
          },
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
    try {
      return await listAllOrganizationsForSuperAdmin();
    } catch (error) {
      console.error(
        "[auth-orgs] super-admin workspace list failed",
        error instanceof Error ? error.message : "unknown error",
      );
      return optionsFromMemberships(user.memberships);
    }
  }

  return optionsFromMemberships(user.memberships);
}

export async function listOrganizationsForUser(userId: string) {
  const user = await withDbRetry((db) =>
    db.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    }),
  );

  if (user?.isSuperAdmin) {
    try {
      return await listAllOrganizationsForSuperAdmin();
    } catch (error) {
      console.error(
        "[auth-orgs] super-admin workspace list failed",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  const memberships = await withDbRetry((db) =>
    db.membership.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        organization: { select: membershipOrgSelect },
      },
    }),
  );

  return optionsFromMemberships(memberships);
}
