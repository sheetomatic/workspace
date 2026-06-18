import Link from "next/link";
import { Settings2 } from "lucide-react";
import { FmsMasterTrackerTable } from "@/components/saas/fms-master-tracker-table";
import type { TrackerTableBlock } from "@/components/saas/fms-master-tracker-table";
import { fmsFormHref, type FmsFromContext } from "@/lib/fms/navigation";

export type FmsTrackerBlock = {
  id: string;
  name: string;
  form: {
    id: string;
    name: string;
    fields: {
      id: string;
      fieldKey: string;
      label: string;
      fieldType: string;
    }[];
  };
  steps: {
    id: string;
    stepName: string;
    roleLabel: string | null;
    instructions: string | null;
    slaType: TrackerTableBlock["steps"][number]["slaType"];
    slaConfig: unknown;
    allowMarkDone: boolean;
    allowUpload: boolean;
    allowNotes: boolean;
    captureFields: unknown;
    defaultOwner: { name: string | null; email: string } | null;
  }[];
  instances: {
    id: string;
    referenceLabel: string | null;
    submission: { values: unknown } | null;
    stepStates: {
      id: string;
      stepId: string;
      status: TrackerTableBlock["instances"][number]["stepStates"][number]["status"];
      plannedAt: Date | null;
      actualAt: Date | null;
      delayMinutes: number | null;
      ownerUserId: string | null;
      owner: { id: string; name: string | null; email: string } | null;
    }[];
  }[];
};

function serializeBlock(block: FmsTrackerBlock): TrackerTableBlock {
  return {
    id: block.id,
    name: block.name,
    form: { id: block.form.id, fields: block.form.fields },
    steps: block.steps,
    instances: block.instances.map((instance) => ({
      id: instance.id,
      referenceLabel: instance.referenceLabel,
      submission: instance.submission,
      stepStates: instance.stepStates.map((state) => ({
        id: state.id,
        stepId: state.stepId,
        status: state.status,
        plannedAt: state.plannedAt?.toISOString() ?? null,
        actualAt: state.actualAt?.toISOString() ?? null,
        delayMinutes: state.delayMinutes,
        ownerUserId: state.ownerUserId,
        owner: state.owner,
      })),
    })),
  };
}

export function FmsMasterTrackerBlock({
  block,
  viewerUserId,
  showEditLink = true,
  summary,
  returnContext = "lines",
  returnTemplateId,
}: {
  block: FmsTrackerBlock;
  viewerUserId?: string;
  showEditLink?: boolean;
  summary?: React.ReactNode;
  returnContext?: FmsFromContext;
  returnTemplateId?: string;
}) {
  const formFromContext: FmsFromContext =
    returnContext === "my-stops" ? "my-stops" : "lines";

  return (
    <section className="ws-sf-card ws-fms-tracker-block">
      <header className="ws-fms-tracker-block-head">
        <div>
          <p className="ws-fms-tracker-block-eyebrow">FMS tracker</p>
          <h2>{block.name}</h2>
          <p className="ws-fms-muted">
            {block.instances.length} lead{block.instances.length === 1 ? "" : "s"} |{" "}
            {block.steps.length} step{block.steps.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="ws-fms-tracker-block-actions">
          <Link
            href={`/app/fms/forms/${block.form.id}/submit`}
            className="btn-primary btn-sm ws-sf-btn-primary"
          >
            New lead
          </Link>
          {showEditLink ? (
            <Link
              href={fmsFormHref(block.form.id, formFromContext)}
              className="ws-fms-tracker-manage-link"
              title="Workflow setup"
            >
              <Settings2 size={16} aria-hidden />
              Workflow setup
            </Link>
          ) : null}
        </div>
      </header>

      {summary ? <div className="ws-fms-tracker-summary">{summary}</div> : null}

      <FmsMasterTrackerTable
        block={serializeBlock(block)}
        viewerUserId={viewerUserId}
        showEditLink={showEditLink}
        returnContext={returnContext}
        returnTemplateId={returnTemplateId}
      />
    </section>
  );
}
