import Link from "next/link";
import { FmsMasterTrackerBlock } from "@/components/saas/fms-master-tracker-block";
import { FmsPagination } from "@/components/saas/fms-pagination";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { canAccessEmReady } from "@/lib/em/em-access";
import { canSubmitFmsForm } from "@/lib/fms/access";
import {
  countCompletedFmsInstances,
  getFmsPipelineCounts,
  listFmsTrackerBlocks,
} from "@/lib/fms/queries";
import { redirect } from "next/navigation";

function mapTrackerBlock(
  block: Awaited<ReturnType<typeof listFmsTrackerBlocks>>[number],
) {
  return {
    id: block.id,
    name: block.name,
    form: block.form,
    steps: block.steps.map((step) => ({
      id: step.id,
      stepName: step.stepName,
      roleLabel: step.roleLabel,
      instructions: step.instructions,
      slaType: step.slaType,
      slaConfig: step.slaConfig,
      allowMarkDone: step.allowMarkDone,
      allowUpload: step.allowUpload,
      allowNotes: step.allowNotes,
      captureFields: step.captureFields,
      defaultOwner: step.defaultOwner,
    })),
    instances: block.instances.map((instance) => ({
      id: instance.id,
      referenceLabel: instance.referenceLabel,
      submission: instance.submission,
      stepStates: instance.stepStates.map((state) => ({
        id: state.id,
        stepId: state.stepId,
        status: state.status,
        plannedAt: state.plannedAt,
        actualAt: state.actualAt,
        delayMinutes: state.delayMinutes,
        ownerUserId: state.ownerUserId,
        owner: state.owner,
      })),
    })),
  };
}

type PageProps = {
  searchParams: Promise<{ completedPage?: string }>;
};

const COMPLETED_PAGE_SIZE = 20;

export default async function FmsLinesPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const completedPage = Math.max(1, Number(params.completedPage ?? "1") || 1);
  const completedSkip = (completedPage - 1) * COMPLETED_PAGE_SIZE;

  const [activeBlocks, completedBlocks, completedTotal, pipelineCounts] =
    await Promise.all([
    listFmsTrackerBlocks(user.organizationId, { instanceStatus: "ACTIVE" }),
    listFmsTrackerBlocks(user.organizationId, {
      instanceStatus: "COMPLETED",
      limit: COMPLETED_PAGE_SIZE,
      skip: completedSkip,
    }),
    countCompletedFmsInstances(user.organizationId),
    getFmsPipelineCounts(user.organizationId),
  ]);

  const completedTotalPages = Math.max(
    1,
    Math.ceil(completedTotal / COMPLETED_PAGE_SIZE),
  );
  const showEmReady = canAccessEmReady(user);

  const activeLeadCount = activeBlocks.reduce(
    (sum, block) => sum + block.instances.length,
    0,
  );

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Live pipelines"
        description="Click any row to open the full journey. Your active stop opens ready to mark done or upload proof."
        actions={
          <>
            {showEmReady ? (
              <Link href="/app/em" className="btn-primary btn-sm ws-sf-btn-primary">
                EM Ready
              </Link>
            ) : null}
            <Link href="/app/fms/ops" className="btn-secondary btn-sm">
              Ops monitor
            </Link>
          </>
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Active FMS</span>
          <strong>{pipelineCounts.active}</strong>
          <span className="ws-stat-card-hint">Running now</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>On track</span>
          <strong>{pipelineCounts.onTrack}</strong>
          <span className="ws-stat-card-hint">Current stop on time</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Delayed</span>
          <strong>{pipelineCounts.delayed}</strong>
          <span className="ws-stat-card-hint">
            {pipelineCounts.delayed > 0 ? "Needs attention" : "None overdue"}
          </span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Pending</span>
          <strong>{pipelineCounts.pending}</strong>
          <span className="ws-stat-card-hint">Awaiting next stop</span>
        </div>
      </div>

      {activeBlocks.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No active lines yet. Submit a live form to start a journey.</p>
          <Link href="/app/fms/setup" className="btn-primary btn-sm ws-sf-btn-primary">
            Go to setup
          </Link>
        </div>
      ) : (
        <div className="ws-fms-tracker-stack">
          {activeBlocks.map((block) => (
            <FmsMasterTrackerBlock
              key={block.id}
              block={mapTrackerBlock(block)}
              viewerUserId={user.id}
              showNewLead={canSubmitFmsForm(user)}
            />
          ))}
        </div>
      )}

      {completedBlocks.length > 0 ? (
        <section className="ws-fms-lines-section" aria-label="Recently completed">
          <header className="ws-fms-section-heading">
            <h2>Recently completed</h2>
            <p>
              {completedTotal} completed job{completedTotal === 1 ? "" : "s"} on this page
              {completedTotalPages > 1
                ? ` (page ${completedPage} of ${completedTotalPages})`
                : ""}
              .
            </p>
          </header>
          <div className="ws-fms-tracker-stack">
            {completedBlocks.map((block) => (
              <FmsMasterTrackerBlock
                key={block.id}
                block={mapTrackerBlock(block)}
                viewerUserId={user.id}
              />
            ))}
          </div>
          <FmsPagination
            page={completedPage}
            totalPages={completedTotalPages}
            total={completedTotal}
            searchParams={params}
            basePath="/app/fms/lines"
            pageParam="completedPage"
            label="completed jobs"
          />
        </section>
      ) : null}

      {activeLeadCount > 0 ? (
        <p className="ws-fms-muted ws-fms-tracker-footnote">
          Tip: click any row to open the full journey. Step gear shows WHAT / HOW / WHO / TAT. Workflow setup edits the FMS structure.
        </p>
      ) : null}
    </div>
  );
}
