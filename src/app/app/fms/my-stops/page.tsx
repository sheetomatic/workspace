import Link from "next/link";
import { FmsLineCard } from "@/components/saas/fms-line-card";
import { FmsPagination } from "@/components/saas/fms-pagination";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { listMyFmsSteps, listFmsInstancesPage } from "@/lib/fms/queries";
import { fmsPageFromSearchParam } from "@/lib/scale";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function FmsMyStopsPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const params = await searchParams;
  const page = fmsPageFromSearchParam(params.page);

  const [mySteps, queuePage] = await Promise.all([
    listMyFmsSteps(user.organizationId, user.id),
    listFmsInstancesPage(user.organizationId, {
      status: "ACTIVE",
      page,
      assigneeUserId: user.id,
    }),
  ]);

  const myInstanceIds = new Set(mySteps.map((s) => s.instanceId));
  const lineCards = queuePage.items.map((job) => ({
    job,
    isMyTurn: myInstanceIds.has(job.id),
  }));

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="My queue"
        description="Tasks on workflows assigned to you. Open a pipeline when it needs your action."
      />

      {lineCards.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No stops assigned to you right now. When a workflow reaches your step, it will appear here.</p>
        </div>
      ) : (
        <>
          <section className="ws-fms-lines-grid" aria-label="Your workflow stops">
            {lineCards.map(({ job, isMyTurn }) => (
              <div
                key={job.id}
                className={`ws-fms-my-stop-wrap${isMyTurn ? " is-my-turn" : ""}`}
              >
                {isMyTurn ? (
                  <p className="ws-fms-my-turn-banner">
                    Train is here - action needed
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
          <FmsPagination
            page={queuePage.page}
            totalPages={queuePage.totalPages}
            total={queuePage.total}
            searchParams={params}
            basePath="/app/fms/my-stops"
            label="assigned lines"
          />
        </>
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
