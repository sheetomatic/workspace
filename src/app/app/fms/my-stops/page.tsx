import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { listFmsQueueTemplatesForUser } from "@/lib/fms/queries";

export default async function FmsMyStopsPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  const templates = await listFmsQueueTemplatesForUser(
    user.organizationId,
    user.id,
  );

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="My queue"
        description="Pick a workflow to open your spreadsheet. You only complete stops assigned to you."
      />

      {templates.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No workflow stops assigned to you right now.</p>
        </div>
      ) : (
        <ul className="ws-fms-queue-template-list">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/app/fms/my-stops/${template.id}`}
                className="ws-fms-queue-template-card"
              >
                <div>
                  <strong>{template.name}</strong>
                  <p className="ws-fms-muted">
                    {template.assignedLeads} lead
                    {template.assignedLeads === 1 ? "" : "s"} assigned |{" "}
                    {template.activeStops} active stop
                    {template.activeStops === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronRight size={18} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
