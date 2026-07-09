import type { Metadata, Viewport } from "next";
import "@/components/saas/workspace-theme.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SaasShell } from "@/components/saas/saas-shell";
import { WorkspaceThemeStyles } from "@/components/saas/workspace-theme-styles";
import { WorkspacePwaInstallBanner } from "@/components/saas/workspace-pwa-install-banner";
import { WorkspacePwaRegister } from "@/components/saas/workspace-pwa-register";
import { WorkspacePendingApproval } from "@/components/saas/workspace-pending-approval";
import { listOrganizationsForUser } from "@/lib/auth-orgs";
import { prisma } from "@/lib/db";
import { getDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import {
  mergeWorkspaceAppearance,
  parseWorkspaceAppearance,
} from "@/lib/workspace-appearance";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";
import { requireSession } from "@/lib/require-session";
import { ensureSessionTenantHost, getRequestTenantSlug } from "@/lib/tenant-host";

export async function generateMetadata(): Promise<Metadata> {
  const tenantSlug = await getRequestTenantSlug();
  const portal = getDedicatedClientPortal(tenantSlug);
  if (portal) {
    const productName = portal.defaultAppearance.productName ?? portal.name;
    return {
      title: `${productName} | Sheetomatic`,
      description: `Secure portal for ${productName}.`,
      manifest: "/app/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        title: productName,
        statusBarStyle: "default",
      },
      icons: {
        apple: "/icons/workspace-icon-192.png?v=5",
      },
      other: {
        "mobile-web-app-capable": "yes",
      },
    };
  }

  return {
    title: "Workspace | Sheetomatic",
    description: "Client business control workspace for Sheetomatic customers.",
    manifest: "/app/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Sheetomatic Workspace",
      statusBarStyle: "default",
    },
    icons: {
      apple: "/icons/workspace-icon-192.png?v=5",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireSession();
  await ensureSessionTenantHost(sessionUser);

  let organization: {
    id: string;
    name: string;
    slug: string;
    status: import("@prisma/client").OrganizationStatus;
    plan: import("@prisma/client").OrgPlan;
    logoUrl: string | null;
    workspaceAppearance: unknown;
    updatedAt: Date;
  } | null = null;
  let organizations: Awaited<ReturnType<typeof listOrganizationsForUser>> = [];

  try {
    [organization, organizations] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: sessionUser.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          plan: true,
          logoUrl: true,
          workspaceAppearance: true,
          updatedAt: true,
        },
      }),
      listOrganizationsForUser(sessionUser.id),
    ]);
  } catch (error) {
    console.error("[app-layout] workspace bootstrap failed", error);
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=workspace"),
    );
  }

  if (!organization) {
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=workspace"),
    );
  }

  if (organization.status !== "ACTIVE" && !sessionUser.isSuperAdmin) {
    return <WorkspacePendingApproval organizationName={organization.name} />;
  }

  const user = {
    ...sessionUser,
    organizationName: organization.name,
  };
  const dedicatedPortal = getDedicatedClientPortal(organization.slug);
  const portalOrganizations = dedicatedPortal
    ? organizations.filter((org) => org.slug === organization.slug)
    : organizations;

  const appearance = mergeWorkspaceAppearance(
    parseWorkspaceAppearance(organization.workspaceAppearance) ??
      dedicatedPortal?.defaultAppearance ??
      null,
    organization.name,
    organization.logoUrl,
    organization.updatedAt.getTime(),
    { dedicatedPortal: Boolean(dedicatedPortal) },
  );

  return (
    <AuthSessionProvider>
      <WorkspaceThemeStyles appearance={appearance} />
      <WorkspacePwaRegister />
      <SaasShell
        appearance={appearance}
        hidePlanBadge={Boolean(dedicatedPortal)}
        isDedicatedPortal={Boolean(dedicatedPortal)}
        organizationPlan={organization.plan}
        organizationPlanLabel={ORG_PLAN_LABELS[organization.plan]}
        organizations={portalOrganizations}
        user={user}
      >
        <WorkspacePwaInstallBanner />
        {children}
      </SaasShell>
    </AuthSessionProvider>
  );
}
