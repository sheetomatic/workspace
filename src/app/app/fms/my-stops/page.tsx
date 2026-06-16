import Link from "next/link";
import { FmsLineCard } from "@/components/saas/fms-line-card";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { listMyFmsSteps, listFmsInstances } from "@/lib/fms/queries";

export default async function FmsMyStopsPage() {
  const user = await requireSession(undefined, { module: "FMS" });

  const [mySteps, instances] = await Promise.all([
    listMyFmsSteps(user.organizationId, user.id),
    listFmsInstances(user.organizationId),
  ]);

  const myInstanceIds = new Set(mySteps.map((s) => s.instanceId));
  const watchingInstances = instances.filter(
    (job) =>
      job.status === "ACTIVE" &&
      job.stepStates.some(
        (s) =>
          s.ownerUserId === user.id &&
          (s.status === "IN_PROGRESS" || s.status === "PENDING"),
      ),
  );

  const lineCards = watchingInstances.map((job) => ({
    job,
    isMyTurn: myInstanceIds.has(job.id),
  }));

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="My stops"
        description="Your station on each route. When the train is at your stop, open the line to complete your work and send it forward."
      />

      {lineCards.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No stops assigned to you right now. When a workflow reaches your step, it will appear here.</p>
        </div>
      ) : (
        <section className="ws-fms-lines-grid" aria-label="Your workflow stops">
          {lineCards.map(({ job, isMyTurn }) => (
            <div
              key={job.id}
              className={`ws-fms-my-stop-wrap${isMyTurn ? " is-my-turn" : ""}`}
            >
              {isMyTurn ? (
                <p className="ws-fms-my-turn-banner">
                  Train is at your stop - action needed
                </p>
              ) : null}
              <FmsLineCard
                instanceId={job.id}
                title={job.referenceLabel ?? job.template.name}
                workflowName={job.template.name}
                status={job.status}
                stepStates={job.stepStates}
              />
            </div>
          ))}
        </section>
      )}

      {mySteps.length > 0 ? (
        <section className="ws-fms-my-stop-actions" aria-label="Quick actions">
          <header className="ws-fms-section-heading">
            <h2>Ready to release</h2>
            <p>Open the line below to complete your stop and move the train forward.</p>
          </header>
          <ul className="ws-fms-my-stop-list">
            {mySteps.map((step) => (
              <li key={step.id}>
                <Link
                  href={`/app/fms/instances/${step.instanceId}`}
                  className="ws-fms-my-stop-link"
                >
                  <strong>{step.step.stepName}</strong>
                  <span className="ws-fms-muted">
                    {step.instance.referenceLabel ?? step.instance.template.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
