import { createHash } from "node:crypto";
import type { InboundLeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";
import { deliverWhatsAppMessage, isOfficialWhatsAppConfigured } from "@/lib/integrations/whatsapp-provider";
import { callbackAcknowledgement, callbackAgentConfig, callbackDeadlineLabel, callbackSchedule,
  CALLBACK_SENDER_PHONE, isCallbackWorkingTime } from "./callback-policy";

// Intake infers stages from keywords ("FMS" becomes SCHEDULE_MEETING, "pricing"
// becomes PROPOSAL). These are still first-call enquiries, not just status NEW.
const FIRST_CALL_STAGES: InboundLeadStatus[] = ["NEW", "SCHEDULE_MEETING", "QUALIFIED",
  "DEMO_SCHEDULED", "FOLLOW_UP", "PROPOSAL", "TRIAL", "NEGOTIATION"];

/** Deterministic DB primary keys provide duplicate safety without a schema migration. */
export function callbackRecordId(organizationId: string, leadId: string, kind: string) {
  return "cb_" + createHash("sha256").update(JSON.stringify([organizationId, leadId, kind])).digest("hex").slice(0, 40);
}

async function verifiedConfig(organizationId: string) {
  const config = callbackAgentConfig();
  if (!config || config.organizationId !== organizationId) return null;
  const [organization, assignee, owner] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { slug: true } }),
    prisma.membership.findUnique({ where: { userId_organizationId: { userId: config.assigneeId, organizationId } },
      include: { user: { select: { name: true } } } }),
    prisma.membership.findUnique({ where: { userId_organizationId: { userId: config.ownerId, organizationId } } }),
  ]);
  if (organization?.slug !== PRIMARY_ORG_SLUG || !assignee || assignee.deactivatedAt ||
      assignee.user.name?.trim().toLowerCase() !== "sumit chandra" || !owner || owner.deactivatedAt ||
      !["OWNER", "ADMIN"].includes(owner.role)) return null;
  return { ...config, assigneeName: assignee.user.name!.trim() };
}

/** Creates a real Tasks record and CRM follow-up in the same transaction as assignment. */
export async function ensureCallbackAssignment(organizationId: string, leadId: string) {
  const config = await verifiedConfig(organizationId);
  if (!config) return false;
  return prisma.$transaction(async (tx) => {
    const taskId = callbackRecordId(organizationId, leadId, "task");
    if (await tx.delegatedTask.findUnique({ where: { id: taskId } })) return true;
    const lead = await tx.inboundLead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead || lead.createdAt < config.enabledSince || (lead.capturedAt && lead.capturedAt < config.enabledSince) ||
        lead.assignedToId || lead.archivedAt || lead.mergedIntoId ||
        !FIRST_CALL_STAGES.includes(lead.status) || lead.callingStatus !== "NOT_CALLED" ||
        !["WHATSAPP", "API", "FACEBOOK", "INSTAGRAM"].includes(lead.channel) ||
        !normalizeWhatsAppPhone(lead.phone ?? "")) return false;
    if (await tx.inboundLeadActivity.findUnique({ where: { id: callbackRecordId(organizationId, leadId, "excluded") } })) return false;
    const { startAt, dueAt } = callbackSchedule(lead.createdAt);
    // Conditional update serializes concurrent ingestion/cron workers and respects manual assignment.
    const claimed = await tx.inboundLead.updateMany({
      where: { id: leadId, organizationId, assignedToId: null, status: { in: FIRST_CALL_STAGES }, callingStatus: "NOT_CALLED", archivedAt: null, mergedIntoId: null },
      data: { assignedToId: config.assigneeId, nextFollowUpAt: dueAt },
    });
    if (!claimed.count) return false;
    const href = `/app/leads?period=all&leadId=${encodeURIComponent(leadId)}`;
    const label = lead.name?.trim() || "New enquiry";
    await tx.delegatedTask.create({ data: {
      id: taskId, organizationId, assigneeUserId: config.assigneeId, createdById: config.ownerId,
      title: `Callback: ${label}`.slice(0, 200), category: "CRM_CALLBACK", department: "SALES",
      priority: "HIGH", startAt, dueAt,
      instructions: `Call ${lead.phone} by ${callbackDeadlineLabel(dueAt)}.\n${lead.requirement ?? ""}\nCRM: ${href}\nRecord the call in CRM and complete this task.`,
      // This agent owns its reminders. Do not also enrol in generic task WhatsApp/email crons.
      remindViaEmail: false, remindViaWhatsApp: false,
    } });
    await tx.inboundLeadFollowUp.create({ data: {
      id: callbackRecordId(organizationId, leadId, "followup"), organizationId, leadId,
      assigneeUserId: config.assigneeId, createdByUserId: config.ownerId, scheduledAt: dueAt,
      notes: "Automatic first callback — Monday–Saturday, 9 AM–7 PM IST; 15-minute SLA.",
    } });
    await tx.inboundLeadActivity.create({ data: {
      id: callbackRecordId(organizationId, leadId, "assignment"), organizationId, leadId, type: "FOLLOW_UP",
      body: `Callback assigned to ${config.assigneeName}, due ${callbackDeadlineLabel(dueAt)}.`,
      metadata: { agent: "callback-v1", taskId, dueAt: dueAt.toISOString() },
    } });
    if (lead.waContactId) await tx.waContact.updateMany({
      where: { id: lead.waContactId, organizationId, assignedToId: null },
      data: { assignedToId: config.assigneeId, nextFollowUpAt: dueAt },
    });
    await tx.userAppNotification.create({ data: {
      id: callbackRecordId(organizationId, leadId, "assigned-notification"), organizationId,
      userId: config.assigneeId, kind: "LEAD_ASSIGNED", title: "New callback assigned",
      body: `${label} — call by ${callbackDeadlineLabel(dueAt)}.`, href,
    } });
    return true;
  });
}

/** At-most-once external attempt: uncertain outcomes are visible, never blindly resent. */
export async function sendCallbackAcknowledgement(organizationId: string, leadId: string, now = new Date()) {
  const config = await verifiedConfig(organizationId);
  if (!config) return "disabled";
  const [lead, task] = await Promise.all([
    prisma.inboundLead.findFirst({ where: { id: leadId, organizationId } }),
    prisma.delegatedTask.findUnique({ where: { id: callbackRecordId(organizationId, leadId, "task") } }),
  ]);
  if (!lead || !task || !lead.phone || lead.assignedToId !== config.assigneeId ||
      task.assigneeUserId !== config.assigneeId || task.completedAt || task.status === "COMPLETED" ||
      lead.callingStatus !== "NOT_CALLED" || !FIRST_CALL_STAGES.includes(lead.status) || lead.archivedAt || lead.mergedIntoId) return "not_applicable";
  const id = callbackRecordId(organizationId, leadId, "ack");
  if (await prisma.inboundLeadActivity.findUnique({ where: { id } })) return "already_attempted";
  const credentials = await resolveWorkspaceWhatsAppCredentials(organizationId);
  let blocked: string | null = null;
  if (task.dueAt <= now) blocked = "callback_already_overdue";
  else if (normalizeWhatsAppPhone(credentials.businessPhone ?? "") !== CALLBACK_SENDER_PHONE || !isOfficialWhatsAppConfigured(credentials))
    blocked = "official_sender_not_verified_in_workspace";
  else if (!await hasActiveWhatsAppSession(organizationId, lead.phone))
    blocked = "no_active_session_requires_opt_in_and_approved_template";
  if (blocked) {
    // Keep blocked records separate from the send claim: a new inbound message can open a session later.
    await prisma.inboundLeadActivity.upsert({ where: { id: callbackRecordId(organizationId, leadId, "ack-blocked") },
      create: { id: callbackRecordId(organizationId, leadId, "ack-blocked"), organizationId, leadId, type: "NOTE", body: `Callback acknowledgement pending: ${blocked}` },
      update: { body: `Callback acknowledgement pending: ${blocked}` } });
    return blocked;
  }
  const body = callbackAcknowledgement(config.assigneeName, task.dueAt);
  const claim = await prisma.inboundLeadActivity.createMany({ data: [{ id, organizationId, leadId, type: "WHATSAPP",
    body, metadata: { agent: "callback-v1", state: "sending", attemptedAt: now.toISOString() } }], skipDuplicates: true });
  if (!claim.count) return "already_attempted";
  let state = "unknown";
  try {
    const result = await deliverWhatsAppMessage({ organizationId, toPhone: lead.phone, signal: AbortSignal.timeout(10_000),
      credentials: { ...credentials, whatsappProvider: "sheetomatic", masApiKey: null, masPassword: null, masUsername: null,
        // Never retry an uncertain RedLava delivery through a second provider.
        metaAccessToken: credentials.redlavaApiKey ? null : credentials.metaAccessToken },
      message: { type: "text", text: { body } }, preferOfficial: true });
    state = result.sent ? "accepted" : "failed";
  } catch { /* A provider timeout may still have sent: requires operator reconciliation. */ }
  await prisma.inboundLeadActivity.update({ where: { id }, data: {
    metadata: { agent: "callback-v1", state, attemptedAt: now.toISOString() },
  } });
  return state;
}

/** Every-minute cron repairs interrupted intake, acknowledges, then escalates open callbacks once. */
export async function runCallbackAgent(now = new Date()) {
  const stopAt = Date.now() + 35_000;
  const rawConfig = callbackAgentConfig();
  if (!rawConfig) return { enabled: false, processed: 0 };
  const config = await verifiedConfig(rawConfig.organizationId);
  if (!config) return { enabled: false, processed: 0, reason: "invalid_workspace_or_members" };
  // Rotate bounded batches rather than letting old invalid/unreachable records starve new enquiries.
  const checkpointKey = `crm-callbacks:${config.organizationId}`;
  const checkpoint = await prisma.cronHeartbeat.findUnique({ where: { jobKey: checkpointKey } });
  let cursors: { leads?: string; jobs?: string } = {};
  try { cursors = JSON.parse(checkpoint?.summary ?? "{}"); } catch { /* first run */ }
  const leads = await prisma.inboundLead.findMany({ where: {
    organizationId: config.organizationId, createdAt: { gte: config.enabledSince }, status: { in: FIRST_CALL_STAGES },
    ...(cursors.leads ? { id: { gt: cursors.leads } } : {}),
    callingStatus: "NOT_CALLED", assignedToId: null, archivedAt: null, mergedIntoId: null,
    channel: { in: ["WHATSAPP", "API", "FACEBOOK", "INSTAGRAM"] },
  }, take: 50, orderBy: { id: "asc" } });
  let leadCursor = cursors.leads;
  let leadsProcessed = 0;
  for (const lead of leads) {
    if (Date.now() >= stopAt) break;
    await ensureCallbackAssignment(config.organizationId, lead.id);
    leadCursor = lead.id; leadsProcessed++;
  }
  const jobs = await prisma.inboundLeadActivity.findMany({ where: {
    organizationId: config.organizationId, metadata: { path: ["agent"], equals: "callback-v1" }, type: "FOLLOW_UP",
    ...(cursors.jobs ? { id: { gt: cursors.jobs } } : {}),
    lead: { archivedAt: null, mergedIntoId: null, status: { in: FIRST_CALL_STAGES }, assignedToId: config.assigneeId, callingStatus: "NOT_CALLED" },
  }, orderBy: { id: "asc" }, take: 50 });
  let jobCursor = cursors.jobs;
  let jobsProcessed = 0;
  for (const job of jobs) {
    if (Date.now() >= stopAt) break;
    jobCursor = job.id; jobsProcessed++;
    const taskId = callbackRecordId(config.organizationId, job.leadId, "task");
    const task = await prisma.delegatedTask.findUnique({ where: { id: taskId } });
    if (!task || task.completedAt || task.status === "COMPLETED" || task.assigneeUserId !== config.assigneeId) continue;
    await sendCallbackAcknowledgement(config.organizationId, job.leadId, now);
    if (task.dueAt > now || !isCallbackWorkingTime(now)) continue;
    const notifications: Prisma.UserAppNotificationCreateManyInput[] = [...new Set([config.assigneeId, config.ownerId])].map((userId) => ({
      id: callbackRecordId(config.organizationId, job.leadId, `overdue-${userId}`),
      organizationId: config.organizationId, userId, kind: "CALLBACK_OVERDUE", title: "15-minute callback overdue",
      body: `${task.title} was due ${callbackDeadlineLabel(task.dueAt)}. Please call or reassign immediately.`,
      href: `/app/leads?period=all&leadId=${encodeURIComponent(job.leadId)}`,
    }));
    await prisma.userAppNotification.createMany({ data: notifications, skipDuplicates: true });
  }
  const summary = JSON.stringify({ leads: leads.length < 50 && leadsProcessed === leads.length ? undefined : leadCursor,
    jobs: jobs.length < 50 && jobsProcessed === jobs.length ? undefined : jobCursor });
  await prisma.cronHeartbeat.upsert({ where: { jobKey: checkpointKey },
    create: { jobKey: checkpointKey, lastRunAt: now, lastOk: true, summary },
    update: { lastRunAt: now, lastOk: true, summary } });
  return { enabled: true, processed: jobsProcessed };
}
