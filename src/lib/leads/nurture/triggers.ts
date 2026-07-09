import type { InboundLeadStatus } from "@prisma/client";
import { triggerLeadNurtureEvent } from "@/lib/leads/nurture/run";
import { STATUS_TO_NURTURE_EVENT } from "@/lib/leads/nurture/templates";

export function queueLeadNurtureAfterAssign(params: {
  organizationId: string;
  leadId: string;
  assigneeUserId: string;
  assigneeName?: string | null;
  actorUserId?: string | null;
}) {
  void triggerLeadNurtureEvent({
    organizationId: params.organizationId,
    leadId: params.leadId,
    event: "assigned",
    assigneeUserId: params.assigneeUserId,
    assigneeName: params.assigneeName,
    actorUserId: params.actorUserId,
  }).catch((error) => {
    console.error("lead assigned nurture", error);
  });
}

export function queueLeadNurtureAfterStatusChange(params: {
  organizationId: string;
  leadId: string;
  status: InboundLeadStatus;
  actorUserId?: string | null;
}) {
  const event = STATUS_TO_NURTURE_EVENT[params.status];
  if (!event) {
    return;
  }
  void triggerLeadNurtureEvent({
    organizationId: params.organizationId,
    leadId: params.leadId,
    event,
    actorUserId: params.actorUserId,
  }).catch((error) => {
    console.error("lead stage nurture", error);
  });
}

export function queueLeadNurtureAfterCall(params: {
  organizationId: string;
  leadId: string;
  discussionSummary?: string | null;
  nextStepLabel?: string | null;
  actorUserId?: string | null;
}) {
  void triggerLeadNurtureEvent({
    organizationId: params.organizationId,
    leadId: params.leadId,
    event: "post_call",
    discussionSummary: params.discussionSummary,
    nextStepLabel: params.nextStepLabel,
    actorUserId: params.actorUserId,
  }).catch((error) => {
    console.error("lead post-call nurture", error);
  });
}
