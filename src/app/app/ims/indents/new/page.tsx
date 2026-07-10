import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsIndentForm } from "@/components/ims/ims-indent-form";
import { requireSession } from "@/lib/require-session";
import { listApprovedRequisitionsForIndent } from "@/lib/ims/indents";
import { listImsVendors } from "@/lib/ims/ims-store";

export default async function ImsNewIndentPage() {
  const user = await requireSession("MANAGER", { module: "IMS" });
  const [requisitions, vendors] = await Promise.all([
    listApprovedRequisitionsForIndent(user.organizationId),
    listImsVendors(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="New indent"
        description="Create purchase indent from an approved material requisition."
        actions={
          <Link href="/app/ims/indents" className="ws-btn ws-btn-ghost">
            Back to list
          </Link>
        }
      />
      <section className="ws-ims-panel">
        {requisitions.length === 0 ? (
          <p className="ws-ims-help">
            No approved MRs available.{" "}
            <Link href="/app/ims/requisitions">Approve a requisition</Link> first.
          </p>
        ) : (
          <ImsIndentForm
            requisitions={requisitions}
            vendors={vendors.map((v) => ({ id: v.id, name: v.name, code: v.code }))}
          />
        )}
      </section>
    </div>
  );
}
