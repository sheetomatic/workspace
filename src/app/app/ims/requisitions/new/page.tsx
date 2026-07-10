import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsRequisitionForm } from "@/components/ims/ims-requisition-form";
import { requireSession } from "@/lib/require-session";
import { listImsItems } from "@/lib/ims/ims-store";

export default async function ImsNewRequisitionPage() {
  const user = await requireSession("MANAGER", { module: "IMS" });
  const items = await listImsItems(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="New material requisition"
        description="Request materials from store. Save as draft or submit for manager approval."
        actions={
          <Link href="/app/ims/requisitions" className="ws-btn ws-btn-ghost">
            Back to list
          </Link>
        }
      />

      <section className="ws-ims-panel">
        {items.length === 0 ? (
          <p className="ws-ims-help">
            Add items first in{" "}
            <Link href="/app/ims/items">Item master</Link> before creating an MR.
          </p>
        ) : (
          <ImsRequisitionForm items={items} />
        )}
      </section>
    </div>
  );
}
