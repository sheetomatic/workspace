import type { InboundLeadStatus, Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import type { LeadCategoryId } from "@/lib/leads/categories";
import { leadHasRequiredContact } from "@/lib/leads/contact-validation";
import {
  buildLeadNurtureMessage,
  LEAD_NURTURE_EVENT_LABELS,
  STAGE_NURTURE_MIN_GAP_HOURS,
  type LeadNurtureEventId,
} from "@/lib/leads/nurture/templates";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import { masCredentialsFromWorkspace } from "@/lib/integrations/whatsapp-provider";
import { sendMasTextMessage } from "@/lib/integrations/messageautosender";
import { isWebBasedApiUiEnabled } from "@/lib/web-based-api-ui";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

const WELCOME_RETRY_BATCH = 10;

const NURTURE_STOP_STATUSES: InboundLeadStatus[] = ["WON", "LOST", "PROJECT_ACTIVE", "PAYMENT"];

export type LeadNurtureState = {
  sentEvents?: Partial<Record<LeadNurtureEventId, string>>;
  lastAssignedNurtureId?: string;
  lastSentAt?: string;
  paused?: boolean;
};

function readNurtureState(rawPayload: unknown): LeadNurtureState {
  if (!rawPayload || typeof rawPayload !== "object") {
    return {};
  }
  const nurture = (rawPayload as Record<string, unknown>).nurture;
  if (!nurture || typeof nurture !== "object") {
    return {};
  }
  return nurture as LeadNurtureState;
}

function mergeNurtureState(
  rawPayload: unknown,
  patch: LeadNurtureState,
): Prisma.InputJsonValue {
  const base =
    rawPayload && typeof rawPayload === "object"
      ? { ...(rawPayload as Record<string, unknown>) }
      : {};
  const existing = readNurtureState(rawPayload);
  base.nurture = { ...existing, ...patch };
  return base as Prisma.InputJsonValue;
}

function eventAlreadySent(state: LeadNurtureState, event: LeadNurtureEventId) {
  return Boolean(state.sentEvents?.[event]);
}

function hoursSince(iso: string | undefined) {
  if (!iso) {
    return Number.POSITIVE_INFINITY;
  }
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (60 * 60 * 1000);
}

function isStageEvent(event: LeadNurtureEventId) {
  return event.startsWith("stage_");
}

function canSendEvent(state: LeadNurtureState, event: LeadNurtureEventId) {
  if (state.paused) {
    return false;
  }
  if (eventAlreadySent(state, event)) {
    return false;
  }
  if (isStageEvent(event) && hoursSince(state.lastSentAt) < STAGE_NURTURE_MIN_GAP_HOURS) {
    return false;
  }
  return true;
}

export async function triggerLeadNurtureEvent(params: {
  organizationId: string;
  leadId: string;
  event: LeadNurtureEventId;
  assigneeName?: string | null;
  discussionSummary?: string | null;
  nextStepLabel?: string | null;
  assigneeUserId?: string | null;
  actorUserId?: string | null;
  force?: boolean;
}): Promise<{ sent: boolean; reason?: string; body?: string }> {
  if (!isWebBasedApiUiEnabled()) {
    return { sent: false, reason: "web_based_api_disabled" };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: params.leadId, organizationId: params.organizationId },
    select: {
      id: true,
      phone: true,
      name: true,
      company: true,
      requirement: true,
      category: true,
      status: true,
      meetingNotes: true,
      discussionNotes: true,
      rawPayload: true,
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!lead || !leadHasRequiredContact(lead.phone)) {
    return { sent: false, reason: "invalid_lead" };
  }

  if (NURTURE_STOP_STATUSES.includes(lead.status)) {
    return { sent: false, reason: "status_stopped" };
  }

  const state = readNurtureState(lead.rawPayload);

  if (params.event === "assigned") {
    const assigneeId = params.assigneeUserId ?? lead.assignedTo?.id;
    if (!assigneeId) {
      return { sent: false, reason: "no_assignee" };
    }
    if (
      !params.force &&
      state.lastAssignedNurtureId === assigneeId &&
      eventAlreadySent(state, "assigned")
    ) {
      return { sent: false, reason: "already_sent_for_assignee" };
    }
  } else if (!params.force && !canSendEvent(state, params.event)) {
    return { sent: false, reason: "skipped_cooldown_or_duplicate" };
  }

  if (params.event === "post_call") {
    const summary =
      params.discussionSummary?.trim() ||
      lead.meetingNotes?.trim() ||
      lead.discussionNotes?.trim();
    if (!summary && !params.force) {
      return { sent: false, reason: "no_discussion_notes" };
    }
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(params.organizationId);
  const mas = masCredentialsFromWorkspace(credentials);
  if (!mas) {
    return { sent: false, reason: "web_based_api_not_configured" };
  }

  const assigneeName = params.assigneeName ?? lead.assignedTo?.name ?? null;
  const discussionSummary =
    params.discussionSummary ?? lead.meetingNotes ?? lead.discussionNotes ?? null;

  const body = buildLeadNurtureMessage({
    event: params.event,
    name: lead.name,
    category: (lead.category as LeadCategoryId | null) ?? null,
    requirement: lead.requirement,
    company: lead.company,
    assigneeName,
    discussionSummary,
    nextStepLabel: params.nextStepLabel ?? leadStatusLabel(lead.status),
    status: lead.status,
  });

  const result = await sendMasTextMessage({ toPhone: lead.phone!, body }, mas);
  if (!result.sent) {
    return { sent: false, reason: result.reason ?? "send_failed", body };
  }

  const sentAt = new Date().toISOString();
  const sentEvents = { ...state.sentEvents, [params.event]: sentAt };
  const assigneeId = params.assigneeUserId ?? lead.assignedTo?.id;

  await prisma.inboundLead.update({
    where: { id: lead.id },
    data: {
      rawPayload: mergeNurtureState(lead.rawPayload, {
        sentEvents,
        lastSentAt: sentAt,
        ...(params.event === "assigned" && assigneeId
          ? { lastAssignedNurtureId: assigneeId }
          : {}),
      }),
      ...(lead.status === "NEW" && params.event === "welcome"
        ? { status: "CONTACTED" as const }
        : {}),
    },
  });

  await logInboundLeadActivity({
    organizationId: params.organizationId,
    leadId: lead.id,
    type: "WHATSAPP",
    body: `[Nurture: ${LEAD_NURTURE_EVENT_LABELS[params.event]}] ${body.slice(0, 200)}${body.length > 200 ? "…" : ""}`,
    metadata: { nurtureEvent: params.event, channel: "WEB_BASED_API" },
    createdByUserId: params.actorUserId ?? null,
  });

  return { sent: true, body };
}

/** Manual send from Leads UI (manager override). */
export async function sendLeadNurtureStep(params: {
  organizationId: string;
  leadId: string;
  stepId: LeadNurtureEventId;
  actorUserId?: string | null;
}) {
  return triggerLeadNurtureEvent({
    organizationId: params.organizationId,
    leadId: params.leadId,
    event: params.stepId,
    actorUserId: params.actorUserId,
    force: true,
  });
}

/** Retry welcome for new leads if the instant send failed (e.g. API down). */
export async function retryPendingWelcomeMessages(organizationId: string): Promise<number> {
  if (!isWebBasedApiUiEnabled()) {
    return 0;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const leads = await withDbRetry((client) =>
    client.inboundLead.findMany({
      where: {
        organizationId,
        phone: { not: null },
        capturedAt: { gte: weekAgo },
        status: { notIn: NURTURE_STOP_STATUSES },
      },
      select: { id: true, rawPayload: true, phone: true },
      orderBy: { capturedAt: "desc" },
      take: WELCOME_RETRY_BATCH,
    }),
  );

  let sent = 0;
  for (const lead of leads) {
    if (!leadHasRequiredContact(lead.phone)) {
      continue;
    }
    const state = readNurtureState(lead.rawPayload);
    if (eventAlreadySent(state, "welcome") || state.paused) {
      continue;
    }
    const result = await triggerLeadNurtureEvent({
      organizationId,
      leadId: lead.id,
      event: "welcome",
    });
    if (result.sent) {
      sent += 1;
    }
  }
  return sent;
}

/** Event-driven nurture only retries welcome; other steps fire on CRM actions. */
export async function runLeadNurtureQueue(organizationId: string) {
  return retryPendingWelcomeMessages(organizationId);
}
