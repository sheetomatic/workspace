import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsMasterTrackerBlock } from "@/components/saas/fms-master-tracker-block";
import {
  FmsMyStopsQueue,
  type FmsMyStopQueueItem,
} from "@/components/saas/fms-my-stops-queue";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { getFmsTrackerBlockByTemplate } from "@/lib/fms/queries";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function FmsMyStopsTemplatePage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { templateId } = await params;

  const template = await getFmsTrackerBlockByTemplate(
    user.organizationId,
    templateId,
    { assigneeUserId: user.id, instanceStatus: "ACTIVE" },
  );

  if (!template) {
    notFound();
  }

  const mySteps = template.instances.flatMap((instance) =>
    instance.stepStates.filter(
      (state) =>
        state.ownerUserId === user.id && state.status === "IN_PROGRESS",
    ),
  );
  const overdue = mySteps.filter((state) =>
    isStepOverdue(
      state.status,
      state.plannedAt,
      state.actualAt,
      state.delayMinutes,
    ),
  ).length;
  const onTrack = mySteps.length - overdue;

  const stepById = new Map(template.steps.map((step) => [step.id, step]));
  const queueItems: FmsMyStopQueueItem[] = template.instances.flatMap((instance) => {
    const activeState = instance.stepStates.find(
      (state) =>
        state.ownerUserId === user.id && state.status === "IN_PROGRESS",
    );
    if (!activeState) {
      return [];
    }

    const step = stepById.get(activeState.stepId);
    const delay = liveDelayMinutes(
      activeState.plannedAt,
      activeState.actualAt,
      activeState.delayMinutes,
    );

    return [
      {
        instanceId: instance.id,
        leadLabel: instance.referenceLabel ?? "Lead",
        stepName: step?.stepName ?? "Your stop",
        plannedAt: activeState.plannedAt?.toISOString() ?? null,
        isOverdue: isStepOverdue(
          activeState.status,
          activeState.plannedAt,
          activeState.actualAt,
          activeState.delayMinutes,
        ),
        delayLabel: formatDelayLabel(delay),
      },
    ];
  });

  const block = {
    id: template.id,
    name: template.name,
    form: template.form,
    steps: template.steps.map((step) => ({
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
    instances: template.instances.map((instance) => ({
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

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title={template.name}
        description="Tap your stop to complete it in two steps. On desktop, open any row for the full spreadsheet view."
        actions={
          <Link href="/app/fms/my-stops" className="btn-secondary btn-sm">
            All workflows
          </Link>
        }
      />

      <div className="ws-fms-my-stops-metrics-mobile">
        <div className="ws-sf-metrics ws-fms-metrics ws-fms-tracker-metrics">
          <div className="ws-sf-metric-tile">
            <span>Your active stops</span>
            <strong>{mySteps.length}</strong>
          </div>
          <div className="ws-sf-metric-tile">
            <span>On track</span>
            <strong>{onTrack}</strong>
          </div>
          <div className="ws-sf-metric-tile">
            <span>Delayed</span>
            <strong>{overdue}</strong>
          </div>
        </div>
      </div>

      <FmsMyStopsQueue items={queueItems} templateId={templateId} />

      <div className="ws-fms-my-stops-tracker-desktop">
      <FmsMasterTrackerBlock
        block={block}
        viewerUserId={user.id}
        showEditLink={false}
        returnContext="my-stops"
        returnTemplateId={templateId}
        showNewLead={false}
        summary={
          <div className="ws-sf-metrics ws-fms-metrics ws-fms-tracker-metrics">
            <div className="ws-sf-metric-tile">
              <span>Your active stops</span>
              <strong>{mySteps.length}</strong>
            </div>
            <div className="ws-sf-metric-tile">
              <span>On track</span>
              <strong>{onTrack}</strong>
            </div>
            <div className="ws-sf-metric-tile">
              <span>Delayed</span>
              <strong>{overdue}</strong>
            </div>
            <div className="ws-sf-metric-tile">
              <span>Assigned leads</span>
              <strong>{template.instances.length}</strong>
            </div>
          </div>
        }
      />
      </div>

      <p className="ws-fms-muted ws-fms-tracker-footnote ws-fms-my-stops-tracker-desktop">
        Click any row to open the journey and complete your stop. Use the gear on a step header for WHAT, HOW, WHO, WHEN, and TAT.
      </p>
    </div>
  );
}
