import "./auth-types";
import { cache } from "react";
import type { Organization, Role, WorkspaceModule } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { allWorkspaceModules, resolveMemberModules } from "@/lib/workspace-modules";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  isSuperAdmin: boolean;
  isDepartmentHead: boolean;
  modules: WorkspaceModule[];
  staffCode: string | null;
};

type ResolvedMembership = {
  role: Role;
  organizationId: string;
  organization: Pick<Organization, "id" | "name" | "slug">;
};

async function resolveSuperAdminMembership(
  organizationSlug?: string,
): Promise<ResolvedMembership | null> {
  const organization = organizationSlug
    ? await prisma.organization.findUnique({ where: { slug: organizationSlug } })
    : (await prisma.organization.findFirst({
        where: { isPrimary: true },
        orderBy: { createdAt: "asc" },
      })) ??
      (await prisma.organization.findUnique({
        where: { slug: PRIMARY_ORG_SLUG },
      })) ??
      (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!organization) {
    return null;
  }

  return {
    role: "OWNER",
    organizationId: organization.id,
    organization,
  };
}

async function resolveMembership(
  userId: string,
  organizationSlug?: string,
): Promise<ResolvedMembership | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    return resolveSuperAdminMembership(organizationSlug);
  }

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    return null;
  }

  if (organizationSlug) {
    const match = memberships.find(
      (item) => item.organization.slug === organizationSlug,
    );
    if (match) {
      return {
        role: match.role,
        organizationId: match.organizationId,
        organization: match.organization,
      };
    }
    // Tenant subdomain login must match this workspace — do not fall back to another org.
    return null;
  }

  const preferred =
    memberships.find(
      (item) => item.organization.slug === PRIMARY_ORG_SLUG,
    ) ??
    memberships.find((item) => item.organization.isPrimary) ??
    memberships[0];

  return {
    role: preferred.role,
    organizationId: preferred.organizationId,
    organization: preferred.organization,
  };
}

function toAuthUser(
  user: { id: string; email: string; name: string | null; isSuperAdmin: boolean },
  membership: ResolvedMembership,
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: membership.role,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    isSuperAdmin: user.isSuperAdmin,
  };
}

const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  cookies: authCookieDomain
    ? {
        sessionToken: {
          options: {
            domain: authCookieDomain,
          },
        },
      }
    : undefined,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        organization: { label: "Organization", type: "text" },
      },
      authorize: async (credentials) => {
        try {
          const email = credentials?.email?.toString().trim().toLowerCase();
          const password = credentials?.password?.toString();
          const organizationSlug = credentials?.organization?.toString().trim();

          if (!email || !password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user?.passwordHash) {
            return null;
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            return null;
          }

          const membership = await resolveMembership(user.id, organizationSlug);
          if (!membership) {
            return null;
          }

          return toAuthUser(user, membership);
        } catch (error) {
          console.error("[auth] authorize failed:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
        token.isSuperAdmin = user.isSuperAdmin ?? false;
      }

      if (trigger === "update" && session?.organizationSlug && token.id) {
        const membership = await resolveMembership(
          token.id as string,
          session.organizationSlug as string,
        );
        if (membership) {
          token.role = membership.role;
          token.organizationId = membership.organizationId;
          token.organizationName = membership.organization.name;
          token.organizationSlug = membership.organization.slug;
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.id && token.role && token.organizationId) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: session.user?.email ?? "",
          name: session.user?.name ?? null,
          role: token.role as Role,
          organizationId: token.organizationId as string,
          organizationName: (token.organizationName as string) ?? "",
          organizationSlug: (token.organizationSlug as string) ?? "",
          isSuperAdmin: Boolean(token.isSuperAdmin),
          modules: [],
        };
      }
      return session;
    },
  },
});

export const getSessionUser = cache(async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const tokenUser = session.user as SessionUser;
  const membership = await resolveMembership(
    tokenUser.id,
    tokenUser.organizationSlug,
  );

  if (!membership) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: { isSuperAdmin: true },
  });

  const isSuperAdmin = dbUser?.isSuperAdmin ?? false;

  if (isSuperAdmin) {
    return {
      id: tokenUser.id,
      email: tokenUser.email,
      name: tokenUser.name,
      role: membership.role,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      isSuperAdmin: true,
      isDepartmentHead: false,
      modules: allWorkspaceModules(),
      staffCode: null,
    };
  }

  const membershipRecord = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: tokenUser.id,
        organizationId: membership.organizationId,
      },
    },
    select: {
      modules: true,
      role: true,
      isDepartmentHead: true,
      staffCode: true,
    },
  });

  return {
    id: tokenUser.id,
    email: tokenUser.email,
    name: tokenUser.name,
    role: membership.role,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    isSuperAdmin: false,
    isDepartmentHead: membershipRecord?.isDepartmentHead ?? false,
    modules: resolveMemberModules(
      membershipRecord?.role ?? membership.role,
      membershipRecord?.modules,
    ),
    staffCode: membershipRecord?.staffCode?.trim() || null,
  };
});
