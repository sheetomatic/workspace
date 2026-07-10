import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsRequisitionsList } from "@/components/ims/ims-requisitions-list";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listMaterialRequisitions } from "@/lib/ims/requisitions";

export default async function ImsRequisitionsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const requisitions = await listMaterialRequisitions(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Material requisitions"
        description="MR → Indent → PO → GRN → MIN voucher chain. Approve MR before purchase or issue."
        actions={
          <Link href="/app/ims/requisitions/new" className="ws-btn ws-btn-primary">
            New MR
          </Link>
        }
      />

      <section className="ws-ims-panel">
        <ImsRequisitionsList
          requisitions={requisitions}
          canApprove={hasMinimumRole(user.role, "MANAGER")}
        />
      </section>
    </div>
  );
}
