import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ChecklistCreateForm } from "@/components/saas/checklist-create-form";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { canConfigureChecklists } from "@/lib/checklists/access";
import { requireSession } from "@/lib/require-session";
import { listAssignableMembers } from "@/lib/tasks";

export default async function NewChecklistPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  if (!canConfigureChecklists(user)) {
    redirect("/app/checklists");
  }

  const members = await listAssignableMembers(user.organizationId);

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-pc-config-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/checklists/setup" className="ws-fms-jf-back">
          Back to setup
        </Link>
      </div>

      <TaskPageToolbar
        title="Configure checklist"
        description="Set schedule, team, and doer for a recurring PC item. Managers assign one-off work in Tasks (EA)."
      />

      <Suspense fallback={<p className="ws-fms-muted">Loading form...</p>}>
        <ChecklistCreateForm members={members} />
      </Suspense>
    </div>
  );
}
