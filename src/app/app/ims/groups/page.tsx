import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsItemGroupsManager } from "@/components/ims/ims-item-groups-manager";
import { requireSession } from "@/lib/require-session";
import { listImsItemGroups } from "@/lib/ims/requisitions";

export default async function ImsGroupsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const groups = await listImsItemGroups(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Item groups"
        description="Classify items as aggregate, assets, consumables, or custom hierarchies."
      />

      <ImsItemGroupsManager groups={groups} />
    </div>
  );
}
