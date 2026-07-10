import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsReceiptForm } from "@/components/ims/ims-receipt-form";
import { requireSession } from "@/lib/require-session";
import { listImsItems, listImsVendors } from "@/lib/ims/ims-store";

export default async function ImsGrnPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, vendors] = await Promise.all([
    listImsItems(user.organizationId),
    listImsVendors(user.organizationId),
  ]);

  const vendorNames = vendors
    .map((vendor) => vendor.name?.trim())
    .filter((value): value is string => Boolean(value));

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="GRN — goods receipt"
        description="Record materials received against PO or direct receipt. Stock moves to usable or QC pending per item policy."
        actions={
          <Link href="/app/ims/movements?type=RM_IN" className="ws-btn ws-btn-ghost">
            Receipt history
          </Link>
        }
      />

      <section className="ws-ims-panel ws-ims-receipt-panel">
        <ImsReceiptForm items={items} vendorNames={vendorNames} />
      </section>
    </div>
  );
}
