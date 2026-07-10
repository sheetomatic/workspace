import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsRacksManager } from "@/components/ims/ims-racks-manager";
import { requireSession } from "@/lib/require-session";
import { listImsRackSections } from "@/lib/ims/racks";

export default async function ImsRacksPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const racks = await listImsRackSections(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Sections / racks"
        description="Bin and aisle locations for store — assign items from item master."
      />
      <ImsRacksManager racks={racks} />
    </div>
  );
}
