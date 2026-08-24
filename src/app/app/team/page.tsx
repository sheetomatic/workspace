import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TeamManagementPanel } from "@/components/saas/team-management-panel";
import { SuperAdminPanel } from "@/components/saas/super-admin-panel";
import { CreateClientWorkspacePanel } from "@/components/saas/create-client-workspace-panel";
import { WorkplaceHrSettingsPanel } from "@/components/saas/workplace-hr-settings-panel";
import { HrWorkSitesPanel } from "@/components/saas/hr-work-sites-panel";
import { HrShiftsPanel } from "@/components/saas/hr-shifts-panel";
import { PageHeader } from "@/components/saas/page-header";
import {
  LegalTeamInvitePanel,
  LegalTeamPageActions,
} from "@/components/legal/legal-team-invite-panel";
import { LegalTeamPanel } from "@/components/legal/legal-team-panel";
import {
  listClientWorkspacesForSuperAdmin,
  listSuperAdmins,
} from "@/app/app/team/platform-actions";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { listActiveHrWorkSites } from "@/lib/hr/sites";
import { ensureDefaultHrShift, listHrShifts } from "@/lib/hr/shifts";
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
import {
  resolveEnabledHrSubModules,
} from "@/lib/hr/hr-sub-modules";
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
  const [allMembers, organization] = await Promise.all([
    listWorkspaceMembers(user.organizationId),
    canManage
      ? prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { allowedModules: true, isPrimary: true },
        })
      : Promise.resolve(null),
  ]);
  const orgAllowedModules = organization
    ? resolveOrgAllowedModules(organization.allowedModules, {
        isPrimary: organization.isPrimary,
      })
    : undefined;
  const orgHasHr = Boolean(orgAllowedModules?.includes("HR"));
  const [hrSettings, workSites, hrShifts] =
    canManage && orgHasHr
      ? await Promise.all([
          getOrCreateHrSettings(user.organizationId),
          listActiveHrWorkSites(user.organizationId),
          ensureDefaultHrShift(user.organizationId).then(() =>
            listHrShifts(user.organizationId),
          ),
        ])
      : [null, [] as Awaited<ReturnType<typeof listActiveHrWorkSites>>, []];
  const orgEnabledHrSubModules = hrSettings
    ? resolveEnabledHrSubModules(hrSettings.enabledHrSubModules)
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
  const [superAdmins, clientWorkspaces] = showSuperAdminPanel
    ? await Promise.all([listSuperAdmins(), listClientWorkspacesForSuperAdmin()])
    : [[], []];

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
            title="Super Admin panel"
            description="Create a separate client workspace, or grant platform admin access."
            defaultOpen
          >
            <CreateClientWorkspacePanel
              workspaces={clientWorkspaces.map((row) => ({
                id: row.id,
                name: row.name,
                slug: row.slug,
                status: row.status,
                plan: row.plan,
                allowedModules: row.allowedModules,
                createdAt: row.createdAt.toISOString(),
                ownerName: row.memberships[0]?.user.name ?? null,
                ownerEmail: row.memberships[0]?.user.email ?? null,
              }))}
            />
            <SuperAdminPanel
              currentUserId={user.id}
              superAdmins={superAdmins}
            />
          </TeamCollapsibleSection>
        ) : null}
        {canManage && orgHasHr && hrSettings ? (
          <TeamCollapsibleSection
            title="Workplace attendance settings"
            description="HR sub-modules, working hours, shifts, short leave, geo-fence, and face recognition."
          >
            <WorkplaceHrSettingsPanel settings={hrSettings} />
            <HrShiftsPanel
              shifts={hrShifts.map((shift) => ({
                id: shift.id,
                name: shift.name,
                code: shift.code,
                startTime: shift.startTime,
                endTime: shift.endTime,
                isDefault: shift.isDefault,
                isActive: shift.isActive,
              }))}
            />
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
        {canManage ? (
          <TeamCollapsibleSection
            title="App Builder"
            description="New client: a phone app on their Gmail Sheet. Grant the module on the invite."
            defaultOpen
          >
            <article className="saas-panel">
              <div className="saas-panel-head">
                <div>
                  <h3>Start from a Sheet</h3>
                  <p>
                    Connect Gmail, pick a template, staff use a link and PIN.
                    Tick <strong>App Builder</strong> on the invite so they see
                    it in the left sidebar.
                  </p>
                </div>
              </div>
              <p>
                <a className="btn-cta btn-secondary" href="/app/app-builder">
                  Open App Builder
                </a>
              </p>
            </article>
          </TeamCollapsibleSection>
        ) : null}
        <TeamManagementPanel
          canManage={canManage}
          currentUserId={user.id}
          defaultInviteOpen={openInvite}
          members={visibleMembers}
          orgAllowedModules={orgAllowedModules}
          orgEnabledHrSubModules={orgEnabledHrSubModules}
          workSites={workSites.map((site) => ({
            id: site.id,
            name: site.name,
          }))}
        />
      </div>
    </div>
  );
}
