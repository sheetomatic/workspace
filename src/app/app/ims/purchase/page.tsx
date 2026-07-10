import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPurchaseBillsList } from "@/components/ims/ims-purchase-bills-list";
import { requireSession } from "@/lib/require-session";
import { listPurchaseBills } from "@/lib/ims/purchase-bills";

export default async function ImsPurchasePage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const bills = await listPurchaseBills(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Purchase bills"
        description="Bill entry against GRN — post when verified."
        actions={
          <Link href="/app/ims/purchase/new" className="ws-btn ws-btn-primary">
            New bill
          </Link>
        }
      />
      <section className="ws-ims-panel">
        <ImsPurchaseBillsList bills={bills} />
      </section>
    </div>
  );
}
