import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPhysicalStockForm } from "@/components/ims/ims-physical-stock-form";
import { ImsPhysicalStockList } from "@/components/ims/ims-physical-stock-list";
import { requireSession } from "@/lib/require-session";
import { getUsableQtyMap, listImsItems } from "@/lib/ims/ims-store";
import { listPhysicalStockCounts } from "@/lib/ims/physical-stock";

export default async function ImsPhysicalStockPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, usableMap, counts] = await Promise.all([
    listImsItems(user.organizationId),
    getUsableQtyMap(user.organizationId),
    listPhysicalStockCounts(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Physical stock count"
        description="Cycle count — post draft to adjust system qty to physical."
      />
      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>New count</h2>
          <ImsPhysicalStockForm items={items} usableMap={usableMap} />
        </section>
        <section className="ws-ims-panel">
          <h2>Counts</h2>
          <ImsPhysicalStockList counts={counts} />
        </section>
      </div>
    </div>
  );
}
