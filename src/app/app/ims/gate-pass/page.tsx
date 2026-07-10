import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsGatePassForm } from "@/components/ims/ims-gate-pass-form";
import { ImsGatePassList } from "@/components/ims/ims-gate-pass-list";
import { requireSession } from "@/lib/require-session";
import { listImsItems } from "@/lib/ims/ims-store";
import { listGatePasses } from "@/lib/ims/gate-pass";

export default async function ImsGatePassPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, passes] = await Promise.all([
    listImsItems(user.organizationId),
    listGatePasses(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Gate pass"
        description="Material out at gate — issue pass to deduct stock."
      />
      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>New gate pass</h2>
          <ImsGatePassForm items={items} />
        </section>
        <section className="ws-ims-panel">
          <h2>Gate passes</h2>
          <ImsGatePassList passes={passes} />
        </section>
      </div>
    </div>
  );
}
