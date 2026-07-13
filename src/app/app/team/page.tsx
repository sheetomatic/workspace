import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TeamManagementPanel } from "@/components/saas/team-management-panel";
import { SuperAdminPanel } from "@/components/saas/super-admin-panel";
import { WorkplaceHrSettingsPanel } from "@/components/saas/workplace-hr-settings-panel";
import { HrWorkSitesPanel } from "@/components/saas/hr-work-sites-panel";
import { PageHeader } from "@/components/saas/page-header";
import {
  LegalTeamInvitePanel,
  LegalTeamPageActions,
} from "@/components/legal/legal-team-invite-panel";
import { LegalTeamPanel } from "@/components/legal/legal-team-panel";
import { listSuperAdmins } from "@/app/app/team/platform-actions";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { listActiveHrWorkSites } from "@/lib/hr/sites";
import {
  canManageTeam,
  canViewTeamPage,
} from "@/lib/team-hierarchy";
import { getLegalDashboardStats } from "@/lib/legal-cases/queries";
import { getViewerMembership, listWorkspaceMembers } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import {
  hasWorkspaceModule,
  isCasesOnlyWorkspace,
} from "@/lib/workspace-modules";
import { tenantPortalOrigin } from "@/lib/workspace-auth-links";
import { resolveOrgAllowedModules } from "@/lib/org-plan-presets";
import "@/components/legal/legal-cases.css";

function TeamCollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="ws-team-collapsible-section" open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
      </summary>
      <div className="ws-team-collapsible-body">{children}</div>
    </details>
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams?: Promise<{ invite?: string }>;
}) {
  const user = await requireSession();
  const params = searchParams ? await searchParams : {};
  const openInvite = params.invite === "1";
  const viewerMembership = await getViewerMembership(
    user.id,
    user.organizationId,
  );

  if (
    !canViewTeamPage(user, viewerMembership?.isDepartmentHead ?? false)
  ) {
    redirect("/app");
  }

  if (isCasesOnlyWorkspace(user) && hasWorkspaceModule(user, "CASES")) {
    const canManage = canManageTeam(user);
    const [members, stats, inviterMembership] = await Promise.all([
      listWorkspaceMembers(user.organizationId),
      getLegalDashboardStats(user),
      prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
        select: { id: true },
      }),
    ]);

    return (
      <div className="saas-page">
        <div className="legal-page-toolbar">
          <PageHeader
            description="Staff codes and case assignment counts."
            title="Team"
          />
          {canManage ? <LegalTeamPageActions /> : null}
        </div>
        {canManage ? (
          <LegalTeamInvitePanel
            reportingManagerId={inviterMembership?.id ?? null}
          />
        ) : null}
        <LegalTeamPanel
          assigneeBreakdown={stats.assigneeBreakdown}
          canManage={canManage}
          currentUserId={user.id}
          members={members}
        />
      </div>
    );
  }

  const canManage = canManageTeam(user);
  const [allMembers, hrSettings, organization, workSites] = await Promise.all([
    listWorkspaceMembers(user.organizationId),
    canManage ? getOrCreateHrSettings(user.organizationId) : Promise.resolve(null),
    canManage
      ? prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { allowedModules: true, isPrimary: true },
        })
      : Promise.resolve(null),
    canManage ? listActiveHrWorkSites(user.organizationId) : Promise.resolve([]),
  ]);
  const orgAllowedModules = organization
    ? resolveOrgAllowedModules(organization.allowedModules, {
        isPrimary: organization.isPrimary,
      })
    : undefined;
  const visibleMembers = canManage
    ? allMembers
    : viewerMembership?.department
      ? allMembers.filter(
          (member) => member.department === viewerMembership.department,
        )
      : [];
  const showSuperAdminPanel =
    canManage && canManageSuperAdmins(user, user.organizationSlug);
  const superAdmins = showSuperAdminPanel ? await listSuperAdmins() : [];

  return (
    <div className="saas-page">
      <PageHeader
        title="Team"
        description={
          canManage
            ? "Add, edit, and manage team members, roles, and attendance settings."
            : "View your department team and member contact details."
        }
      />
      {canManage ? (
        <p className="ws-tenant-portal-hint">
          Company workspace URL:{" "}
          <a href={tenantPortalOrigin(user.organizationSlug)}>
            {user.organizationSlug}.sheetomatic.com
          </a>
        </p>
      ) : null}
      <div className="ws-team-section-stack">
        {showSuperAdminPanel ? (
          <TeamCollapsibleSection
            title="Platform super admins"
            description="Grant or revoke platform admin access."
          >
            <SuperAdminPanel
              currentUserId={user.id}
              superAdmins={superAdmins}
            />
          </TeamCollapsibleSection>
        ) : null}
        {canManage && hrSettings ? (
          <TeamCollapsibleSection
            title="Workplace attendance settings"
            description="Working hours, short leave, geo-fence, and face recognition."
          >
            <WorkplaceHrSettingsPanel settings={hrSettings} />
            <HrWorkSitesPanel
              sites={workSites.map((site) => ({
                id: site.id,
                name: site.name,
                lat: site.lat,
                lng: site.lng,
                geoFenceRadiusM: site.geoFenceRadiusM,
              }))}
            />
          </TeamCollapsibleSection>
        ) : null}
        <TeamManagementPanel
          canManage={canManage}
          currentUserId={user.id}
          defaultInviteOpen={openInvite}
          members={visibleMembers}
          orgAllowedModules={orgAllowedModules}
          workSites={workSites.map((site) => ({
            id: site.id,
            name: site.name,
          }))}
        />
      </div>
    </div>
  );
}
