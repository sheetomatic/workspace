import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsWastageForm } from "@/components/ims/ims-wastage-form";
import { requireSession } from "@/lib/require-session";
import { getUsableQtyMap, listImsItems } from "@/lib/ims/ims-store";

export default async function ImsWastagePage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, usableMap] = await Promise.all([
    listImsItems(user.organizationId),
    getUsableQtyMap(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Wastage"
        description="Record scrap and wastage — deducts usable stock immediately."
      />
      <section className="ws-ims-panel">
        <ImsWastageForm items={items} usableMap={usableMap} />
      </section>
    </div>
  );
}
