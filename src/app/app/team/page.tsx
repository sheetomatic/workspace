import { TeamManagementPanel } from "@/components/saas/team-management-panel";
import { SuperAdminPanel } from "@/components/saas/super-admin-panel";
import { WorkplaceHrSettingsPanel } from "@/components/saas/workplace-hr-settings-panel";
import { PageHeader } from "@/components/saas/page-header";
import { listSuperAdmins } from "@/app/app/team/platform-actions";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { listWorkspaceMembers } from "@/lib/workspace";

export default async function TeamPage() {
  const user = await requireSession("ADMIN");
  const [members, hrSettings] = await Promise.all([
    listWorkspaceMembers(user.organizationId),
    getOrCreateHrSettings(user.organizationId),
  ]);
  const showSuperAdminPanel = canManageSuperAdmins(user, user.organizationSlug);
  const superAdmins = showSuperAdminPanel ? await listSuperAdmins() : [];

  return (
    <div className="saas-page">
      <PageHeader
        title="Team"
        description="Manage people, departments, designations, roles, WhatsApp numbers, and attendance settings per member."
      />
      {showSuperAdminPanel ? (
        <SuperAdminPanel
          currentUserId={user.id}
          superAdmins={superAdmins}
        />
      ) : null}
      <WorkplaceHrSettingsPanel settings={hrSettings} />
      <TeamManagementPanel
        currentUserId={user.id}
        members={members}
      />
    </div>
  );
}
