import { GoogleSheetsSettingsPanel } from "@/components/saas/google-sheets-settings-panel";
import { NotificationSettingsPanel } from "@/components/saas/notification-settings-panel";
import { ChangePasswordPanel } from "@/components/saas/change-password-panel";
import { TaskAiSettingsPanel } from "@/components/saas/task-ai-settings-panel";
import { WorkspaceLinksPanel } from "@/components/saas/workspace-links-panel";
import { WorkspaceAppearancePanel } from "@/components/saas/workspace-appearance-panel";
import { WorkspaceAddonsPanel } from "@/components/saas/workspace-addons-panel";
import { WorkspaceSettingsForm } from "@/components/saas/workspace-settings-form";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { getTaskAiUsageSummary } from "@/lib/integrations/task-ai-settings";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import {
  getGoogleSheetsConnectionStatus,
  getSpreadsheetIdForOrganization,
} from "@/lib/integrations/google-sheets-dashboard";
import { PageHeader } from "@/components/saas/page-header";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { ROLE_LABELS } from "@/lib/permissions";
import { hasMinimumRole } from "@/lib/permissions";
import { resolveDedicatedOrgAllowedModules } from "@/lib/dedicated-client-portals";
import { isDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import { getOrCreateNotificationSettings } from "@/lib/notification-settings";
import { requireSession } from "@/lib/require-session";
import {
  getWorkspaceSummary,
  listWorkspaceLinks,
} from "@/lib/workspace";
import {
  mergeWorkspaceAppearance,
  parseWorkspaceAppearance,
} from "@/lib/workspace-appearance";

export default async function SettingsPage() {
  const user = await requireSession();
  const canManageAdmin = hasMinimumRole(user.role, "ADMIN");
  const canViewTaskAi =
    hasWorkspaceModule(user, "TASKS") && hasMinimumRole(user.role, "MANAGER");
  const platformStatus = getIntegrationStatus();
  const [{ organization }, links, spreadsheetId, notificationSettings, taskAiSummary] =
    await Promise.all([
      getWorkspaceSummary(user.organizationId),
      canManageAdmin ? listWorkspaceLinks(user.organizationId) : Promise.resolve([]),
      canManageAdmin
        ? getSpreadsheetIdForOrganization(user.organizationId)
        : Promise.resolve(null),
      getOrCreateNotificationSettings(user.id, user.organizationId),
      canViewTaskAi
        ? getTaskAiUsageSummary(user.organizationId)
        : Promise.resolve(null),
    ]);
  const sheetsConnection = getGoogleSheetsConnectionStatus(spreadsheetId);
  const statusLabel =
    organization.status === "ACTIVE" ? "Active" : "Onboarding";
  const appearance = mergeWorkspaceAppearance(
    parseWorkspaceAppearance(organization.workspaceAppearance),
    organization.name,
    organization.logoUrl,
    organization.updatedAt.getTime(),
  );
  const isDedicatedPortal = isDedicatedClientPortal(user.organizationSlug);
  const allowedModules = resolveDedicatedOrgAllowedModules(
    user.organizationSlug,
    organization.allowedModules,
    { isPrimary: organization.isPrimary },
  );

  return (
    <div className="saas-page saas-settings-page">
      <PageHeader
        title="Settings"
        description={
          canManageAdmin
            ? "Company name, alerts, and linked Sheets, apps, and dashboards."
            : "Your alert preferences for cases and tasks in this workspace."
        }
      />
      <div className="saas-settings-grid">
        <ChangePasswordPanel />
        <NotificationSettingsPanel settings={notificationSettings} />
        {canManageAdmin ? (
          <>
            {!isDedicatedPortal ? (
              <WorkspaceAddonsPanel
                allowedModules={allowedModules}
                canEdit={user.isSuperAdmin || (hasMinimumRole(user.role, "OWNER") && organization.isPrimary)}
                plan={organization.plan}
              />
            ) : null}
            <WorkspaceAppearancePanel appearance={appearance} />
            <article className="saas-panel">
              <h3>Company</h3>
              <WorkspaceSettingsForm
                canEdit={canManageAdmin}
                initialName={organization.name}
              />
              <dl className="saas-settings-list saas-settings-list-meta">
                <div>
                  <dt>Workspace ID</dt>
                  <dd>
                    <code>{organization.slug}</code>
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{statusLabel}</dd>
                </div>
                <div>
                  <dt>Workspace type</dt>
                  <dd>
                    {isDedicatedPortal
                      ? "Dedicated client portal"
                      : organization.isPrimary
                        ? "Primary platform workspace"
                        : "Client workspace"}
                  </dd>
                </div>
                {isDedicatedPortal ? (
                  <div>
                    <dt>Portal URL</dt>
                    <dd>
                      <code>{user.organizationSlug}.sheetomatic.com</code>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Your role</dt>
                  <dd>
                    {user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role]}
                  </dd>
                </div>
              </dl>
            </article>
            <article className="saas-panel">
              <h3>Google Sheets (dashboard data)</h3>
              <GoogleSheetsSettingsPanel
                canEdit={canManageAdmin}
                connection={sheetsConnection}
                initialSheetId={
                  organization.googleSheetId
                    ? organization.googleSheetGid
                      ? `https://docs.google.com/spreadsheets/d/${organization.googleSheetId}/edit?gid=${organization.googleSheetGid}`
                      : organization.googleSheetId
                    : ""
                }
              />
            </article>
            <article className="saas-panel">
              <h3>Connected systems</h3>
              <WorkspaceLinksPanel links={links} />
            </article>
          </>
        ) : null}
        {canViewTaskAi && taskAiSummary ? (
          <article className="saas-panel">
            <h3>
              <SheetomaticAiMark sizes="sm" />
              Task AI usage
            </h3>
            <TaskAiSettingsPanel
              canEdit={canManageAdmin}
              openaiConfigured={platformStatus.openai}
              summary={taskAiSummary}
            />
          </article>
        ) : null}
        {!canManageAdmin ? (
          <article className="saas-panel">
            <h3>Your account</h3>
            <dl className="saas-settings-list saas-settings-list-meta">
              <div>
                <dt>Workspace</dt>
                <dd>{organization.name}</dd>
              </div>
              <div>
                <dt>Your role</dt>
                <dd>
                  {user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role]}
                </dd>
              </div>
            </dl>
            <p className="saas-panel-lead">
              Company and integration settings are managed by workspace admins.
            </p>
          </article>
        ) : null}
      </div>
    </div>
  );
}
