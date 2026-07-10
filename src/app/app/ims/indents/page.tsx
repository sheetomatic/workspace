import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsIndentsList } from "@/components/ims/ims-indents-list";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listIndents } from "@/lib/ims/indents";

export default async function ImsIndentsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const indents = await listIndents(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Indents"
        description="Purchase indents from approved MR — approve before PO."
        actions={
          <Link href="/app/ims/indents/new" className="ws-btn ws-btn-primary">
            New indent
          </Link>
        }
      />
      <section className="ws-ims-panel">
        <ImsIndentsList
          indents={indents}
          canApprove={hasMinimumRole(user.role, "MANAGER")}
        />
      </section>
    </div>
  );
}
