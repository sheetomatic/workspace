import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@/components/saas/workspace-theme.css";
import "@/components/saas/apple-design-system.css";
import "@/components/saas/workspace-glide.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SaasShell } from "@/components/saas/saas-shell";
import { TrainingPortalShell } from "@/components/saas/training-portal-shell";
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
import {
  DEFAULT_WORKSPACE_NAV_PREFS,
  parseWorkspaceNavPrefs,
} from "@/lib/workspace-nav-prefs";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";
import { logoutHref } from "@/lib/auth-logout";
import { requireSession } from "@/lib/require-session";
import {
  ensureSessionTenantHost,
  getRequestPathname,
  getRequestTenantSlug,
  isLearnPortalRequest,
} from "@/lib/tenant-host";
import { isAppBuilderStudioPath } from "@/lib/subdomain";
import { AppBuilderShell } from "@/components/app-builder/app-builder-shell";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { resolveMemberHrSubModules } from "@/lib/hr/hr-sub-modules";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { isWhatsAppOnlyTeamMember } from "@/lib/tasks/org-task-policy";
import { WhatsAppOnlyGate } from "@/components/saas/whatsapp-only-gate";
import { isBillingPortalPath } from "@/lib/billing/access";
import { hasMinimumRole } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  if (await isLearnPortalRequest()) {
    return {
      title: "Learn | Sheetomatic",
      description: "Students and Teach — the Sheetomatic training portal.",
    };
  }

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
        apple: "/icons/workspace-icon-192.png?v=6",
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
      apple: "/icons/workspace-icon-192.png?v=6",
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
  const learnPortal = await isLearnPortalRequest();

  let organization: {
    id: string;
    name: string;
    slug: string;
    status: import("@prisma/client").OrganizationStatus;
    plan: import("@prisma/client").OrgPlan;
    product: import("@prisma/client").WorkspaceProduct;
    logoUrl: string | null;
    workspaceAppearance: unknown;
    updatedAt: Date;
  } | null = null;
  let organizations: Awaited<ReturnType<typeof listOrganizationsForUser>> = [];
  let navPrefs = DEFAULT_WORKSPACE_NAV_PREFS;
  let enabledHrSubModules: string[] | null = null;
  let enabledCrmSubModules: string[] | null = null;

  try {
    const [orgResult, orgsResult, membershipPrefs, hrSettings] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: sessionUser.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          plan: true,
          product: true,
          logoUrl: true,
          workspaceAppearance: true,
          updatedAt: true,
        },
      }),
      listOrganizationsForUser(sessionUser.id),
      prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: sessionUser.id,
            organizationId: sessionUser.organizationId,
          },
        },
        select: {
          workspacePrefs: true,
          enabledHrSubModules: true,
          enabledCrmSubModules: true,
        },
      }),
      hasWorkspaceModule(sessionUser, "HR")
        ? getOrCreateHrSettings(sessionUser.organizationId)
        : Promise.resolve(null),
    ]);
    organization = orgResult;
    organizations = orgsResult;
    navPrefs = parseWorkspaceNavPrefs(membershipPrefs?.workspacePrefs);
    if (hrSettings) {
      const { resolveMemberHrSubModules } = await import(
        "@/lib/hr/hr-sub-modules"
      );
      enabledHrSubModules = resolveMemberHrSubModules(
        hrSettings.enabledHrSubModules,
        membershipPrefs?.enabledHrSubModules,
      );
    }
    if (hasWorkspaceModule(sessionUser, "CRM")) {
      const { resolveMemberCrmSubModules } = await import(
        "@/lib/crm/crm-sub-modules"
      );
      enabledCrmSubModules = resolveMemberCrmSubModules(
        membershipPrefs?.enabledCrmSubModules,
      );
    }
  } catch (error) {
    console.error("[app-layout] workspace bootstrap failed", error);
    redirect(logoutHref("/login?error=workspace"));
  }

  if (!organization) {
    redirect(logoutHref("/login?error=workspace"));
  }

  if (organization.status !== "ACTIVE" && !sessionUser.isSuperAdmin) {
    const pathname = await getRequestPathname();
    const canOpenBilling =
      (organization.status === "HOLD" || organization.status === "INACTIVE") &&
      hasMinimumRole(sessionUser.role, "ADMIN") &&
      isBillingPortalPath(pathname);
    if (!canOpenBilling) {
      return (
        <WorkspacePendingApproval
          billingHref={
            hasMinimumRole(sessionUser.role, "ADMIN") ? "/app/billing" : undefined
          }
          organizationName={organization.name}
          status={organization.status}
        />
      );
    }
  }

  if (
    isWhatsAppOnlyTeamMember(
      organization.slug,
      sessionUser.role,
      sessionUser.isSuperAdmin,
    )
  ) {
    return (
      <AuthSessionProvider>
        <WhatsAppOnlyGate
          organizationName={organization.name}
          userName={sessionUser.name?.trim() || sessionUser.email}
        />
      </AuthSessionProvider>
    );
  }

  if (organization.product === "APP_BUILDER") {
    const pathname = await getRequestPathname();
    const pathOnly = pathname.split("?")[0] ?? pathname;
    // getRequestPathname() falls back to "/app" when middleware did not set
    // x-pathname. Redirecting that default looped the studio.
    if (
      pathOnly !== "/app" &&
      !isAppBuilderStudioPath(pathOnly) &&
      !pathOnly.startsWith("/app/manifest")
    ) {
      redirect("/app/app-builder");
    }

    return (
      <AuthSessionProvider>
        <AppBuilderShell
          organizationName={organization.name}
          userEmail={sessionUser.email}
        >
          {children}
        </AppBuilderShell>
      </AuthSessionProvider>
    );
  }

  if (learnPortal) {
    return (
      <AuthSessionProvider>
        <TrainingPortalShell
          organizationName={organization.name}
          userName={sessionUser.name?.trim() || sessionUser.email}
        >
          {children}
        </TrainingPortalShell>
      </AuthSessionProvider>
    );
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
        enabledCrmSubModules={enabledCrmSubModules}
        enabledHrSubModules={enabledHrSubModules}
        hidePlanBadge={Boolean(dedicatedPortal)}
        isDedicatedPortal={Boolean(dedicatedPortal)}
        navPrefs={navPrefs}
        organizationPlan={organization.plan}
        organizationPlanLabel={ORG_PLAN_LABELS[organization.plan]}
        organizations={portalOrganizations}
        user={user}
      >
        <WorkspacePwaInstallBanner />
        <Suspense
          fallback={
            <div
              className="saas-page ws-page-loading"
              aria-busy="true"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                minHeight: 320,
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  height: 3,
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, #0176d3 0%, #7eb6ff 50%, #0176d3 100%)",
                }}
              />
              <div
                style={{
                  width: "min(240px, 60%)",
                  height: 28,
                  borderRadius: 8,
                  background: "#e2e8f0",
                }}
              />
              <div
                style={{ height: 220, borderRadius: 12, background: "#e2e8f0" }}
              />
              <span className="sr-only">Loading workspace…</span>
            </div>
          }
        >
          {children}
        </Suspense>
      </SaasShell>
    </AuthSessionProvider>
  );
}
