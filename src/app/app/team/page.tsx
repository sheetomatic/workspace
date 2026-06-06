import { redirect } from "next/navigation";
import { TeamManagementPanel } from "@/components/saas/team-management-panel";
import { TeamHierarchyPanel } from "@/components/saas/team-hierarchy-panel";
import { SuperAdminPanel } from "@/components/saas/super-admin-panel";
import { WorkplaceHrSettingsPanel } from "@/components/saas/workplace-hr-settings-panel";
import { PageHeader } from "@/components/saas/page-header";
import { listSuperAdmins } from "@/app/app/team/platform-actions";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import {
  canManageTeam,
  canViewTeamPage,
  filterMembersForViewer,
} from "@/lib/team-hierarchy";
import { getViewerMembership, listWorkspaceMembers } from "@/lib/workspace";
import { tenantPortalOrigin } from "@/lib/workspace-auth-links";

export default async function TeamPage() {
  const user = await requireSession();
  const viewerMembership = await getViewerMembership(
    user.id,
    user.organizationId,
  );

  if (
    !canViewTeamPage(user, viewerMembership?.isDepartmentHead ?? false)
  ) {
    redirect("/app");
  }

  const canManage = canManageTeam(user);
  const [allMembers, hrSettings] = await Promise.all([
    listWorkspaceMembers(user.organizationId),
    canManage ? getOrCreateHrSettings(user.organizationId) : Promise.resolve(null),
  ]);
  const members = filterMembersForViewer(allMembers, {
    canManage,
    viewerDepartment: viewerMembership?.department ?? null,
  });
  const showSuperAdminPanel =
    canManage && canManageSuperAdmins(user, user.organizationSlug);
  const superAdmins = showSuperAdminPanel ? await listSuperAdmins() : [];

  return (
    <div className="saas-page">
      <PageHeader
        title="Team"
        description={
          canManage
            ? "Manage people, departments, reporting lines, and attendance settings per member."
            : "View your department team, reporting structure, and member emails."
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
      {showSuperAdminPanel ? (
        <SuperAdminPanel
          currentUserId={user.id}
          superAdmins={superAdmins}
        />
      ) : null}
      {canManage && hrSettings ? (
        <WorkplaceHrSettingsPanel settings={hrSettings} />
      ) : null}
      <TeamHierarchyPanel canManage={canManage} members={members} />
      {canManage ? (
        <TeamManagementPanel
          currentUserId={user.id}
          members={allMembers}
        />
      ) : null}
    </div>
  );
}
