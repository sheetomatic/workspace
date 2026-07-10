import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsConsumptionTable } from "@/components/ims/ims-consumption-table";
import { requireSession } from "@/lib/require-session";
import { getConsumptionReport } from "@/lib/ims/consumption";

export default async function ImsConsumptionPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const rows = await getConsumptionReport(user.organizationId, from, to);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Consumption"
        description="Issue-based consumption — last 30 days (MIN and FG out movements)."
      />
      <section className="ws-ims-panel">
        <ImsConsumptionTable rows={rows} />
      </section>
    </div>
  );
}
