import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPurchaseBillForm } from "@/components/ims/ims-purchase-bill-form";
import { requireSession } from "@/lib/require-session";
import { listImsVendors } from "@/lib/ims/ims-store";

export default async function ImsNewPurchaseBillPage() {
  const user = await requireSession("MANAGER", { module: "IMS" });
  const vendors = await listImsVendors(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="New purchase bill"
        description="Record vendor bill against GRN reference."
        actions={
          <Link href="/app/ims/purchase" className="ws-btn ws-btn-ghost">
            Back to list
          </Link>
        }
      />
      <section className="ws-ims-panel">
        {vendors.length === 0 ? (
          <p className="ws-ims-help">
            Add vendors in <Link href="/app/ims/vendors">Vendor master</Link> first.
          </p>
        ) : (
          <ImsPurchaseBillForm
            vendors={vendors.map((v) => ({ id: v.id, name: v.name, code: v.code }))}
          />
        )}
      </section>
    </div>
  );
}
