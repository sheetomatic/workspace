import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsStockRegisterTable } from "@/components/ims/ims-stock-register-table";
import { requireSession } from "@/lib/require-session";
import { getStockRegisterRows } from "@/lib/ims/requisitions";

export default async function ImsRegisterPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const rows = await getStockRegisterRows(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Stock register"
        description="Item-wise ledger — opening balance is implicit; movements update usable and QC pending buckets."
      />

      <section className="ws-ims-panel">
        <ImsStockRegisterTable rows={rows} />
      </section>
    </div>
  );
}
