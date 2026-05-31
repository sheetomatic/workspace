import { ApprovalsList } from "@/components/saas/approvals-list";
import { PageHeader } from "@/components/saas/page-header";
import { requireSession } from "@/lib/require-session";
import { syncApprovalsFromGoogleSheets } from "@/lib/integrations/sync-sheets-to-db";
import { listWorkspaceApprovals } from "@/lib/workspace-data";

export default async function ApprovalsPage() {
  const user = await requireSession("MANAGER");

  try {
    await syncApprovalsFromGoogleSheets(user.organizationId);
  } catch {
    // Use database approvals when Sheets is unavailable
  }

  const pending = await listWorkspaceApprovals(user);

  return (
    <div className="saas-page">
      <PageHeader
        title="Approvals"
        description="Review items synced from your Approvals sheet tab before they go into MIS."
      />
      {pending.length === 0 ? (
        <div className="ws-empty-state">
          <p>No pending approvals for your role.</p>
        </div>
      ) : (
        <ApprovalsList items={pending} />
      )}
    </div>
  );
}
