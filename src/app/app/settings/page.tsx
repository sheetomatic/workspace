import { GoogleSheetsSettingsPanel } from "@/components/saas/google-sheets-settings-panel";
import { WorkspaceLinksPanel } from "@/components/saas/workspace-links-panel";
import { WorkspaceSettingsForm } from "@/components/saas/workspace-settings-form";
import {
  getGoogleSheetsConnectionStatus,
  getSpreadsheetIdForOrganization,
} from "@/lib/integrations/google-sheets-dashboard";
import { PageHeader } from "@/components/saas/page-header";
import { ROLE_LABELS } from "@/lib/permissions";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import {
  getWorkspaceSummary,
  listWorkspaceLinks,
} from "@/lib/workspace";

export default async function SettingsPage() {
  const user = await requireSession("ADMIN");
  const [{ organization }, links, spreadsheetId] = await Promise.all([
    getWorkspaceSummary(user.organizationId),
    listWorkspaceLinks(user.organizationId),
    getSpreadsheetIdForOrganization(user.organizationId),
  ]);
  const sheetsConnection = getGoogleSheetsConnectionStatus(spreadsheetId);
  const canEdit = hasMinimumRole(user.role, "ADMIN");
  const statusLabel =
    organization.status === "ACTIVE" ? "Active" : "Onboarding";

  return (
    <div className="saas-page">
      <PageHeader
        title="Settings"
        description="Company name and linked Sheets, apps, and dashboards."
      />
      <div className="saas-settings-grid">
        <article className="saas-panel">
          <h3>Company</h3>
          <WorkspaceSettingsForm
            canEdit={canEdit}
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
                {organization.isPrimary ? "Primary platform workspace" : "Client workspace"}
              </dd>
            </div>
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
            canEdit={canEdit}
            connection={sheetsConnection}
            initialSheetId={organization.googleSheetId ?? ""}
          />
        </article>
        <article className="saas-panel">
          <h3>Connected systems</h3>
          <WorkspaceLinksPanel links={links} />
        </article>
      </div>
    </div>
  );
}
