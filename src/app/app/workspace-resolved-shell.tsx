import { redirect } from "next/navigation";
import { SaasShell } from "@/components/saas/saas-shell";
import { WorkspaceThemeStyles } from "@/components/saas/workspace-theme-styles";
import { WorkspacePwaInstallBanner } from "@/components/saas/workspace-pwa-install-banner";
import { listOrganizationsForUser } from "@/lib/auth-orgs";
import { getDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import {
  mergeWorkspaceAppearance,
  parseWorkspaceAppearance,
} from "@/lib/workspace-appearance";
import { parseWorkspaceNavPrefs } from "@/lib/workspace-nav-prefs";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";
import { logoutHref } from "@/lib/auth-logout";
import type { SessionUser } from "@/lib/auth";
import { getHrSettings } from "@/lib/hr/hr-store";
import { resolveMemberHrSubModules } from "@/lib/hr/hr-sub-modules";
import { resolveMemberCrmSubModules } from "@/lib/crm/crm-sub-modules";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import {
  getWorkspaceMembershipPrefs,
  getWorkspaceOrganization,
} from "@/lib/workspace-shell-data";

export async function WorkspaceResolvedShell({
  sessionUser,
  children,
}: {
  sessionUser: SessionUser;
  children: React.ReactNode;
}) {
  let organization: Awaited<ReturnType<typeof getWorkspaceOrganization>> = null;
  let organizations: Awaited<ReturnType<typeof listOrganizationsForUser>> = [];
  let navPrefs = parseWorkspaceNavPrefs(null);
  let enabledHrSubModules: string[] | null = null;
  let enabledCrmSubModules: string[] | null = null;

  try {
    const [orgResult, orgsResult, membershipPrefs, hrSettings] =
      await Promise.all([
        getWorkspaceOrganization(sessionUser.organizationId),
        listOrganizationsForUser(sessionUser.id),
        getWorkspaceMembershipPrefs(sessionUser.id, sessionUser.organizationId),
        hasWorkspaceModule(sessionUser, "HR")
          ? getHrSettings(sessionUser.organizationId)
          : Promise.resolve(null),
      ]);
    organization = orgResult;
    organizations = orgsResult;
    navPrefs = parseWorkspaceNavPrefs(membershipPrefs?.workspacePrefs);
    if (hasWorkspaceModule(sessionUser, "HR")) {
      enabledHrSubModules = resolveMemberHrSubModules(
        hrSettings?.enabledHrSubModules,
        membershipPrefs?.enabledHrSubModules,
      );
    }
    if (hasWorkspaceModule(sessionUser, "CRM")) {
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
    <>
      <WorkspaceThemeStyles appearance={appearance} />
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
        {children}
      </SaasShell>
    </>
  );
}
