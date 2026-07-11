import type { InboundLeadStatus, Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import type { LeadCategoryId } from "@/lib/leads/categories";
import { leadHasRequiredContact } from "@/lib/leads/contact-validation";
import { getLeadNurtureConfig } from "@/lib/leads/nurture/config";
import { isLeadNurtureSendingEnabled } from "@/lib/leads/nurture/sending-enabled";
import {
  canSendEvent,
  eventAlreadySent,
  readNurtureState,
  WELCOME_COOLDOWN_HOURS,
  type LeadNurtureState,
} from "@/lib/leads/nurture/state";
import {
  buildLeadNurtureMessage,
  LEAD_NURTURE_EVENT_LABELS,
  type LeadNurtureEventId,
} from "@/lib/leads/nurture/templates";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import { masCredentialsFromWorkspace } from "@/lib/integrations/whatsapp-provider";
import { sendMasTextMessage } from "@/lib/integrations/messageautosender";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export {
  canSendEvent,
  eventAlreadySent,
  readNurtureState,
  WELCOME_COOLDOWN_HOURS,
  type LeadNurtureState,
};

const WELCOME_RETRY_BATCH = 10;

const NURTURE_STOP_STATUSES: InboundLeadStatus[] = ["WON", "LOST", "PROJECT_ACTIVE", "PAYMENT"];

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

async function healWelcomeSentState(params: {
  leadId: string;
  rawPayload: unknown;
  sentAt?: string;
}) {
  const state = readNurtureState(params.rawPayload);
  if (eventAlreadySent(state, "welcome")) {
    return;
  }
  const sentAt = params.sentAt ?? new Date().toISOString();
  await prisma.inboundLead.update({
    where: { id: params.leadId },
    data: {
      rawPayload: mergeNurtureState(params.rawPayload, {
        sentEvents: { ...state.sentEvents, welcome: sentAt },
        lastSentAt: state.lastSentAt ?? sentAt,
      }),
    },
  });
}

/** True if this lead (or same phone recently) already got a welcome WA. */
export async function welcomeAlreadyDelivered(params: {
  organizationId: string;
  leadId: string;
  phone: string;
  rawPayload: unknown;
}): Promise<{ delivered: boolean; reason?: string }> {
  const state = readNurtureState(params.rawPayload);
  if (eventAlreadySent(state, "welcome")) {
    return { delivered: true, reason: "sent_events" };
  }

  const leadActivity = await prisma.inboundLeadActivity.findFirst({
    where: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      type: "WHATSAPP",
      metadata: { path: ["nurtureEvent"], equals: "welcome" },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (leadActivity) {
    await healWelcomeSentState({
      leadId: params.leadId,
      rawPayload: params.rawPayload,
      sentAt: leadActivity.createdAt.toISOString(),
    });
    return { delivered: true, reason: "activity_log" };
  }

  const since = new Date(Date.now() - WELCOME_COOLDOWN_HOURS * 60 * 60 * 1000);
  const phoneActivity = await prisma.inboundLeadActivity.findFirst({
    where: {
      organizationId: params.organizationId,
      type: "WHATSAPP",
      createdAt: { gte: since },
      metadata: { path: ["nurtureEvent"], equals: "welcome" },
      lead: {
        organizationId: params.organizationId,
        phone: params.phone,
      },
    },
    select: { id: true, leadId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (phoneActivity) {
    await healWelcomeSentState({
      leadId: params.leadId,
      rawPayload: params.rawPayload,
      sentAt: phoneActivity.createdAt.toISOString(),
    });
    return { delivered: true, reason: "phone_cooldown" };
  }

  const siblingLeads = await prisma.inboundLead.findMany({
    where: {
      organizationId: params.organizationId,
      phone: params.phone,
      id: { not: params.leadId },
    },
    select: { id: true, rawPayload: true },
    take: 25,
  });

  for (const sibling of siblingLeads) {
    if (eventAlreadySent(readNurtureState(sibling.rawPayload), "welcome")) {
      await healWelcomeSentState({
        leadId: params.leadId,
        rawPayload: params.rawPayload,
      });
      return { delivered: true, reason: "sibling_lead" };
    }
  }

  return { delivered: false };
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
  const sendingEnabled = await isLeadNurtureSendingEnabled(params.organizationId);
  if (!sendingEnabled) {
    return { sent: false, reason: "nurture_disabled_or_not_configured" };
  }

  const nurtureConfig = await getLeadNurtureConfig(params.organizationId);

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
  } else if (
    !params.force &&
    !canSendEvent(state, params.event, nurtureConfig.stageMinGapHours)
  ) {
    return { sent: false, reason: "skipped_cooldown_or_duplicate" };
  }

  if (params.event === "welcome" && !params.force) {
    const prior = await welcomeAlreadyDelivered({
      organizationId: params.organizationId,
      leadId: lead.id,
      phone: lead.phone!,
      rawPayload: lead.rawPayload,
    });
    if (prior.delivered) {
      return { sent: false, reason: prior.reason ?? "welcome_already_delivered" };
    }
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
    nurtureConfig,
  });

  // Claim before send so concurrent sync/retry cannot double-fire the same welcome.
  let welcomeClaimAt: string | null = null;
  if (params.event === "welcome" && !params.force) {
    welcomeClaimAt = new Date().toISOString();
    const fresh = await prisma.inboundLead.findFirst({
      where: { id: lead.id, organizationId: params.organizationId },
      select: { rawPayload: true },
    });
    const freshState = readNurtureState(fresh?.rawPayload);
    if (eventAlreadySent(freshState, "welcome")) {
      return { sent: false, reason: "skipped_cooldown_or_duplicate" };
    }
    await prisma.inboundLead.update({
      where: { id: lead.id },
      data: {
        rawPayload: mergeNurtureState(fresh?.rawPayload ?? lead.rawPayload, {
          sentEvents: { ...freshState.sentEvents, welcome: `claim:${welcomeClaimAt}` },
        }),
      },
    });
  }

  const result = await sendMasTextMessage({ toPhone: lead.phone!, body }, mas);
  if (!result.sent) {
    if (welcomeClaimAt) {
      const failed = await prisma.inboundLead.findFirst({
        where: { id: lead.id },
        select: { rawPayload: true },
      });
      const failedState = readNurtureState(failed?.rawPayload);
      const claimed = failedState.sentEvents?.welcome;
      if (typeof claimed === "string" && claimed.startsWith("claim:")) {
        const { welcome: _drop, ...restSent } = failedState.sentEvents ?? {};
        void _drop;
        await prisma.inboundLead.update({
          where: { id: lead.id },
          data: {
            rawPayload: mergeNurtureState(failed?.rawPayload, {
              sentEvents: restSent,
            }),
          },
        });
      }
    }
    return { sent: false, reason: result.reason ?? "send_failed", body };
  }

  const sentAt = new Date().toISOString();
  const sentEvents = { ...state.sentEvents, [params.event]: sentAt };
  const assigneeId = params.assigneeUserId ?? lead.assignedTo?.id;

  // Re-read payload so we do not wipe fields written concurrently (e.g. WA sync).
  const latest = await prisma.inboundLead.findFirst({
    where: { id: lead.id },
    select: { rawPayload: true, status: true },
  });

  await prisma.inboundLead.update({
    where: { id: lead.id },
    data: {
      rawPayload: mergeNurtureState(latest?.rawPayload ?? lead.rawPayload, {
        sentEvents: {
          ...readNurtureState(latest?.rawPayload).sentEvents,
          ...sentEvents,
        },
        lastSentAt: sentAt,
        ...(params.event === "assigned" && assigneeId
          ? { lastAssignedNurtureId: assigneeId }
          : {}),
      }),
      ...(latest?.status === "NEW" && params.event === "welcome"
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
  if (!(await isLeadNurtureSendingEnabled(organizationId))) {
    return 0;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const leads = await withDbRetry((client) =>
    client.inboundLead.findMany({
      where: {
        organizationId,
        phone: { not: null },
        capturedAt: { gte: weekAgo },
        // Only NEW — CONTACTED+ already received (or should not get) welcome.
        status: "NEW",
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
    const prior = await welcomeAlreadyDelivered({
      organizationId,
      leadId: lead.id,
      phone: lead.phone!,
      rawPayload: lead.rawPayload,
    });
    if (prior.delivered) {
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
