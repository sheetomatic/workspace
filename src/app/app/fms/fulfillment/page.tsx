import Link from "next/link";
import { Suspense } from "react";
import { GitBranch, Search } from "lucide-react";
import { FmsFulfillmentFlowNav } from "@/components/saas/fms-fulfillment-flow-nav";
import { FmsMasterTrackerBlock } from "@/components/saas/fms-master-tracker-block";
import { FmsPagination } from "@/components/saas/fms-pagination";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { canSubmitFmsForm } from "@/lib/fms/access";
import { countCompletedFmsInstances, listFmsTrackerBlocks } from "@/lib/fms/queries";
import { isStepOverdue } from "@/lib/fms/step-display";
import {
  isSalesFulfillmentFmsFlow,
  resolveFulfillmentFlowMeta,
} from "@/lib/fms/sales-fulfillment";
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
  searchParams: Promise<{ completedPage?: string; q?: string; flow?: string }>;
};

const COMPLETED_PAGE_SIZE = 20;

export default async function FmsFulfillmentPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const flowParam = params.flow?.trim();
  const flow = isSalesFulfillmentFmsFlow(flowParam) ? flowParam : "sales-order";
  const flowMeta = resolveFulfillmentFlowMeta(flow);
  const completedPage = Math.max(1, Number(params.completedPage ?? "1") || 1);
  const completedSkip = (completedPage - 1) * COMPLETED_PAGE_SIZE;
  const referenceQuery = params.q?.trim() || undefined;

  const trackerFilter = {
    instanceStatus: "ACTIVE" as const,
    templateKeywords: flowMeta.matchKeywords,
    ...(referenceQuery ? { referenceQuery } : {}),
  };

  const [activeBlocks, completedBlocks, completedTotal] = await Promise.all([
    listFmsTrackerBlocks(user.organizationId, trackerFilter),
    listFmsTrackerBlocks(user.organizationId, {
      instanceStatus: "COMPLETED",
      templateKeywords: flowMeta.matchKeywords,
      limit: COMPLETED_PAGE_SIZE,
      skip: completedSkip,
      ...(referenceQuery ? { referenceQuery } : {}),
    }),
    countCompletedFmsInstances(user.organizationId, flowMeta.matchKeywords),
  ]);

  const completedTotalPages = Math.max(
    1,
    Math.ceil(completedTotal / COMPLETED_PAGE_SIZE),
  );

  const activeCount = activeBlocks.reduce(
    (sum, block) => sum + block.instances.length,
    0,
  );

  const delayedCount = activeBlocks.reduce(
    (sum, block) =>
      sum +
      block.instances.filter((instance) =>
        instance.stepStates.some((state) =>
          isStepOverdue(state.status, state.plannedAt, state.actualAt, state.delayMinutes),
        ),
      ).length,
    0,
  );

  const flowQuery = flow === "sales-order" ? "" : `flow=${flow}`;
  const searchSuffix = [flowQuery, referenceQuery ? `q=${encodeURIComponent(referenceQuery)}` : ""]
    .filter(Boolean)
    .join("&");

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-ffp">
      <header className="ws-ffp-header">
        <div className="ws-ffp-header-title">
          <h1>{flow === "recruitment" ? "Recruitment FMS" : "Process FMS"}</h1>
          <p>{flowMeta.description}</p>
        </div>
        <div className="ws-ffp-header-actions">
          {flow === "recruitment" ? (
            <Link href="/app/hr" className="btn-secondary btn-sm">
              HR Dashboard
            </Link>
          ) : (
            <Link href="/app/sales-orders" className="btn-secondary btn-sm">
              Sales orders
            </Link>
          )}
          <Link href="/app/fms/lines" className="btn-secondary btn-sm">
            All pipelines
          </Link>
        </div>
      </header>

      {flow !== "recruitment" ? (
        <Suspense fallback={null}>
          <FmsFulfillmentFlowNav />
        </Suspense>
      ) : null}

      <div className="ws-ffp-toolbar">
        <form action="/app/fms/fulfillment" method="get" className="ws-ffp-search">
          {flow !== "sales-order" ? (
            <input type="hidden" name="flow" value={flow} />
          ) : null}
          <Search size={15} aria-hidden className="ws-ffp-search-icon" />
          <input
            name="q"
            type="search"
            placeholder="Search SO# or reference"
            defaultValue={referenceQuery ?? ""}
            aria-label="Filter pipelines by reference"
          />
          {referenceQuery ? (
            <Link
              href={`/app/fms/fulfillment${flowQuery ? `?${flowQuery}` : ""}`}
              className="ws-ffp-search-clear"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <div className="ws-ffp-stats" aria-label={`${flowMeta.label} summary`}>
          <span className="ws-ffp-stat">
            <strong>{activeCount}</strong> active
          </span>
          <span className={`ws-ffp-stat${delayedCount > 0 ? " is-delayed" : ""}`}>
            <strong>{delayedCount}</strong> delayed
          </span>
          <span className="ws-ffp-stat">
            <strong>{completedTotal}</strong> completed
          </span>
        </div>
      </div>

      {referenceQuery ? (
        <p className="ws-ffp-filter-hint">
          Showing {flowMeta.label.toLowerCase()} FMS matching{" "}
          <strong>“{referenceQuery}”</strong>
        </p>
      ) : null}

      {activeBlocks.length === 0 ? (
        <div className="ws-ffp-empty">
          <span className="ws-ffp-empty-icon" aria-hidden>
            <GitBranch size={22} />
          </span>
          <h2>No active {flowMeta.label.toLowerCase()} FMS</h2>
          <p>
            {flow === "leads"
              ? "Instances start when a lead process runs."
              : flow === "recruitment"
                ? "Instances start when a hiring position is opened. Provision the Recruitment FMS from Setup, then submit an open position."
                : "Instances appear here when linked to a sales order in the fulfillment pipeline."}
          </p>
          <Link
            href={
              flow === "leads"
                ? "/app/leads"
                : flow === "recruitment"
                  ? "/app/fms/setup/business"
                  : "/app/sales-orders"
            }
            className="btn-primary btn-sm ws-sf-btn-primary"
          >
            {flow === "leads"
              ? "Open leads"
              : flow === "recruitment"
                ? "Open business setup"
                : "Open sales orders"}
          </Link>
        </div>
      ) : (
        <section className="ws-ffp-section" aria-label="Active instances">
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
        </section>
      )}

      {completedBlocks.length > 0 ? (
        <section className="ws-ffp-section ws-ffp-completed" aria-label="Recently completed">
          <header className="ws-ffp-section-head">
            <h2>Recently completed</h2>
            <span>
              {completedTotal} job{completedTotal === 1 ? "" : "s"}
              {completedTotalPages > 1
                ? ` · page ${completedPage} of ${completedTotalPages}`
                : ""}
            </span>
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
            basePath="/app/fms/fulfillment"
            pageParam="completedPage"
            label="completed jobs"
          />
        </section>
      ) : null}
    </div>
  );
}
