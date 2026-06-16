import { FmsStatusBadge } from "@/components/saas/fms-status-badge";

type PipelineStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ARCHIVED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

function isLive(formStatus: string, workflowStatus?: string | null) {
  return (
    formStatus === "ACTIVE" &&
    (!workflowStatus || workflowStatus === "ACTIVE")
  );
}

/** One badge when form + workflow are both live; split labels only when they differ. */
export function FmsPipelineStatusBadge({
  formStatus,
  workflowStatus,
}: {
  formStatus: string;
  workflowStatus?: string | null;
}) {
  if (isLive(formStatus, workflowStatus)) {
    return <span className="ws-sf-badge ws-sf-badge-live">Live</span>;
  }

  if (!workflowStatus) {
    return <FmsStatusBadge status={formStatus} />;
  }

  if (formStatus === workflowStatus) {
    return <FmsStatusBadge status={formStatus} />;
  }

  return (
    <span className="ws-fms-pipeline-status">
      <span className="ws-fms-pipeline-status-part">
        <span className="ws-fms-pipeline-status-label">Form</span>
        <FmsStatusBadge status={formStatus as PipelineStatus} />
      </span>
      <span className="ws-fms-pipeline-status-part">
        <span className="ws-fms-pipeline-status-label">Workflow</span>
        <FmsStatusBadge status={workflowStatus as PipelineStatus} />
      </span>
    </span>
  );
}
