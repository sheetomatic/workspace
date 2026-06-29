import { ApprovalsList } from "@/components/saas/approvals-list";
import { PageHeader } from "@/components/saas/page-header";
import { SignupApprovalsPanel } from "@/components/saas/signup-approvals-panel";
import { requireSession } from "@/lib/require-session";
import { syncApprovalsFromGoogleSheets } from "@/lib/integrations/sync-sheets-to-db";
import { listPendingWorkspaceSignups } from "@/lib/pending-workspace-signups";
import { listWorkspaceApprovals } from "@/lib/workspace-data";

export default async function ApprovalsPage() {
  const user = await requireSession("MANAGER", { module: "APPROVALS" });

  const [pendingSignups, sheetApprovals] = await Promise.all([
    user.isSuperAdmin ? listPendingWorkspaceSignups() : Promise.resolve([]),
    (async () => {
      try {
        await syncApprovalsFromGoogleSheets(user.organizationId);
      } catch {
        // Use database approvals when Sheets is unavailable
      }
      return listWorkspaceApprovals(user);
    })(),
  ]);

  return (
    <div className="saas-page ws-tasks-sf">
      <PageHeader
        title="Approvals"
        description={
          user.isSuperAdmin
            ? "Approve new workspace signups and review operational items before they go into MIS."
            : "Review items synced from your Approvals sheet tab before they go into MIS."
        }
      />

      {user.isSuperAdmin ? (
        <SignupApprovalsPanel workspaces={pendingSignups} />
      ) : null}

      <section className="ws-sf-list-view" aria-label="Operational approvals">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Operational approvals</h2>
            <span className="ws-sf-list-view-count">{sheetApprovals.length}</span>
          </div>
        </header>

        {sheetApprovals.length === 0 ? (
          <div className="ws-empty-state">
            <p>No pending operational approvals for your role.</p>
          </div>
        ) : (
          <ApprovalsList items={sheetApprovals} />
        )}
      </section>
    </div>
  );
}
