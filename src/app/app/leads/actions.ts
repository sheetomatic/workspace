"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type {
  InboundLeadStatus,
  LeadCallingStatus,
  LeadPaymentMethod,
  LeadPaymentType,
  LeadProjectStatus,
  LeadSourceChannel,
  Prisma,
  QuotationRequestType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { isActiveOrgMember } from "@/lib/assignee-org";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { generateLeadMachineApiKey } from "@/lib/leads/api-auth";
import { isLeadSourceComingSoon } from "@/lib/leads/channels";
import {
  categorizeLeadRequirement,
  defaultPipeValueForCategory,
  isLeadCategoryId,
  migrateLegacyLeadCategory,
  resolveLeadCategoryId,
} from "@/lib/leads/categories";
import { bridgeInboundLeadToFms } from "@/lib/leads/fms-bridge";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";
import { testLeadsGoogleSheetAccess } from "@/lib/leads/google-sheets";
import { pushLeadToGoogleSheet, syncLeadsTwoWay } from "@/lib/leads/google-sheets-export";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { buildGoogleSheetsLeadConfigFromInput } from "@/lib/leads/sheet-config";
import {
  formatLeadSyncCounts,
  formatLeadSyncError,
  type LeadSyncCounts,
} from "@/lib/leads/sync-messages";
import { pullLeadsFromConnection } from "@/lib/leads/sync-sources";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { findDuplicateLeads } from "@/lib/leads/duplicates";
import { generateLeadQualificationSummary } from "@/lib/leads/ai-summary";
import { mergeInboundLeads } from "@/lib/leads/merge";
import { computeLeadScore, recomputeAndSaveScore } from "@/lib/leads/scoring";
import { sendPlainEmail } from "@/lib/integrations/email";
import {
  checkTaskAiOrgQuota,
  recordTaskAiUsage,
} from "@/lib/integrations/task-ai-settings";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  computeQuotationEndDate,
  parseQuotationStartDate,
  paymentTermsForRequestType,
} from "@/lib/leads/quotation-content";
import {
  buildQuotationPublicUrl,
  buildQuotationShareMessage,
  computeQuotationTotals,
  lockLatestLeadQuotation,
  nextQuotationNumber,
  revisionQuotationNumber,
} from "@/lib/leads/quotations";
import { createSalesOrderFromLockedQuotation } from "@/lib/sales-orders/create-from-quotation";
import { createQuotationShareToken } from "@/lib/leads/quotation-tokens";
import { sendLeadNurtureStep } from "@/lib/leads/nurture/run";
import {
  getLeadNurtureConfig,
  NURTURE_EVENT_ORDER,
  parseLeadNurtureConfig,
  saveLeadNurtureConfig,
  type LeadNurtureOrgConfig,
} from "@/lib/leads/nurture/config";
import type { LeadNurtureEventId } from "@/lib/leads/nurture/templates";
import {
  queueLeadNurtureAfterAssign,
  queueLeadNurtureAfterCall,
  queueLeadNurtureAfterStatusChange,
} from "@/lib/leads/nurture/triggers";
import { buildClientMeetingInviteEmail } from "@/lib/leads/meeting-invite";
import { inferLeadStageFromRequirement } from "@/lib/leads/stage-ai";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import {
  asConfigRecord,
  metaLeadWebhookUrl,
  parseMetaLeadAdsConfig,
  readString,
  telegramLeadWebhookUrl,
} from "@/lib/leads/connection-config";
import {
  mergeMetaLeadAdsConfig,
  verifyMetaPageAccessToken,
} from "@/lib/leads/meta-lead-ads";
import {
  defaultMetaVerifyTokenForOrg,
  ensureTelegramWebhookSecret,
} from "@/lib/leads/source-settings";
import {
  setTelegramWebhook,
  verifyTelegramBotToken,
} from "@/lib/leads/telegram-leads";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

function exportLeadToGoogleSheetAfterSave(
  organizationId: string,
  leadId: string,
) {
  after(() => {
    void pushLeadToGoogleSheet(organizationId, leadId).catch((error) => {
      console.error("[leads-sheet-export]", error);
    });
  });
}

function scheduleInboundLeadActivity(
  params: Parameters<typeof logInboundLeadActivity>[0],
) {
  after(() => {
    void logInboundLeadActivity(params).catch((error) => {
      console.error("[leads-activity]", error);
    });
  });
}

export async function assignInboundLead(leadId: string, assigneeUserId: string | null) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  if (
    assigneeUserId &&
    !(await isActiveOrgMember(user.organizationId, assigneeUserId))
  ) {
    return {
      ok: false,
      message: "Selected assignee must be an active member of this workspace.",
    };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { assignedToId: assigneeUserId || null, modifiedAt: new Date() },
  });

  if (assigneeUserId) {
    const assignee = await prisma.user.findFirst({
      where: { id: assigneeUserId },
      select: { name: true },
    });
    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId,
      type: "EDIT",
      body: `Assigned to ${assignee?.name ?? "team member"}`,
      createdByUserId: user.id,
    });
    queueLeadNurtureAfterAssign({
      organizationId: user.organizationId,
      leadId,
      assigneeUserId,
      assigneeName: assignee?.name,
      actorUserId: user.id,
    });
  }

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function updateInboundLeadStatus(leadId: string, status: InboundLeadStatus) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const existing = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: {
      phone: true,
      email: true,
      company: true,
      requirement: true,
      callingStatus: true,
      pipeValue: true,
    },
  });
  if (!existing) {
    return { ok: false, message: "Lead not found." };
  }

  const { score, temperature } = computeLeadScore({
    ...existing,
    status,
  });

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { status, score, temperature, modifiedAt: new Date() },
  });

  scheduleInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "STATUS_CHANGE",
    body: `Status changed to ${status.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  queueLeadNurtureAfterStatusChange({
    organizationId: user.organizationId,
    leadId,
    status,
    actorUserId: user.id,
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true, score, temperature };
}

export async function updateInboundLeadCategory(leadId: string, category: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  if (!isLeadCategoryId(category)) {
    return { ok: false, message: "Invalid category." };
  }

  const existing = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { category: true },
  });
  if (!existing) {
    return { ok: false, message: "Lead not found." };
  }

  if (existing.category === category) {
    return { ok: true };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { category, modifiedAt: new Date() },
  });

  scheduleInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "EDIT",
    body: `Category set to ${category.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function updateInboundLeadDetails(params: {
  leadId: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  zipCode: string;
  requirement: string;
  /** When omitted, existing discussion notes are left unchanged. */
  discussionNotes?: string;
  quotationValue: string;
  pipeValue: string;
  category?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  campaign?: string;
  landingPage?: string;
  expectedCloseAt?: string;
  winProbability?: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const existing = await prisma.inboundLead.findFirst({
    where: { id: params.leadId, organizationId: user.organizationId },
    select: {
      phone: true,
      email: true,
      requirement: true,
      category: true,
      status: true,
      callingStatus: true,
    },
  });
  if (!existing) {
    return { ok: false, message: "Lead not found." };
  }

  const phoneNormalized =
    leadPhoneDigits(params.phone) ?? (params.phone.trim() || null);
  const emailTrimmed = params.email.trim() || null;
  const existingPhoneNormalized =
    leadPhoneDigits(existing.phone) ?? (existing.phone?.trim() || null);
  const existingEmailNormalized = existing.email?.trim().toLowerCase() || null;
  const nextEmailNormalized = emailTrimmed?.toLowerCase() || null;
  const contactUnchanged =
    phoneNormalized === existingPhoneNormalized &&
    nextEmailNormalized === existingEmailNormalized;

  if (!contactUnchanged) {
    const duplicates = await findDuplicateLeads(user.organizationId, {
      phone: phoneNormalized,
      email: emailTrimmed,
      excludeLeadId: params.leadId,
    });
    const activeDuplicates = duplicates.filter((m) => !m.archivedAt);
    if (activeDuplicates.length > 0) {
      return {
        ok: false as const,
        duplicate: true as const,
        message: `Another lead already uses this phone or email (${activeDuplicates[0].name ?? activeDuplicates[0].id}).`,
        matches: activeDuplicates,
      };
    }
  }

  const requirementTrimmed = params.requirement.trim() || null;
  const requirementChanged = requirementTrimmed !== (existing.requirement ?? null);
  const category =
    params.category && isLeadCategoryId(params.category)
      ? params.category
      : requirementChanged
        ? categorizeLeadRequirement(requirementTrimmed)
        : resolveLeadCategoryId(existing.category);
  const quotation = Number.parseFloat(params.quotationValue);
  const pipe = Number.parseFloat(params.pipeValue);
  const pipeValue =
    Number.isFinite(pipe) && pipe > 0
      ? pipe
      : defaultPipeValueForCategory(category);

  const { score, temperature } = computeLeadScore({
    phone: phoneNormalized,
    email: emailTrimmed,
    company: params.company.trim() || null,
    requirement: requirementTrimmed,
    status: existing.status,
    callingStatus: existing.callingStatus,
    pipeValue,
  });

  let expectedCloseAt: Date | null | undefined;
  if (params.expectedCloseAt !== undefined) {
    const raw = params.expectedCloseAt.trim();
    if (!raw) {
      expectedCloseAt = null;
    } else {
      const parsed = new Date(raw);
      expectedCloseAt = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  let winProbability: number | null | undefined;
  if (params.winProbability !== undefined) {
    const raw = params.winProbability.trim();
    if (!raw) {
      winProbability = null;
    } else {
      const n = Number.parseInt(raw, 10);
      winProbability =
        Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
    }
  }

  const utmPatch = {
    ...(params.utmSource !== undefined
      ? { utmSource: params.utmSource.trim() || null }
      : {}),
    ...(params.utmMedium !== undefined
      ? { utmMedium: params.utmMedium.trim() || null }
      : {}),
    ...(params.utmCampaign !== undefined
      ? { utmCampaign: params.utmCampaign.trim() || null }
      : {}),
    ...(params.utmContent !== undefined
      ? { utmContent: params.utmContent.trim() || null }
      : {}),
    ...(params.utmTerm !== undefined
      ? { utmTerm: params.utmTerm.trim() || null }
      : {}),
    ...(params.campaign !== undefined
      ? { campaign: params.campaign.trim() || null }
      : {}),
    ...(params.landingPage !== undefined
      ? { landingPage: params.landingPage.trim() || null }
      : {}),
    ...(expectedCloseAt !== undefined ? { expectedCloseAt } : {}),
    ...(winProbability !== undefined ? { winProbability } : {}),
  };

  await prisma.inboundLead.updateMany({
    where: { id: params.leadId, organizationId: user.organizationId },
    data: {
      name: params.name.trim() || null,
      phone: phoneNormalized,
      email: emailTrimmed,
      company: params.company.trim() || null,
      address: params.address.trim() || null,
      zipCode: params.zipCode.trim() || null,
      requirement: params.requirement.trim() || null,
      ...(params.discussionNotes !== undefined
        ? { discussionNotes: params.discussionNotes.trim() || null }
        : {}),
      category,
      quotationValue: Number.isFinite(quotation) && quotation > 0 ? quotation : null,
      pipeValue,
      score,
      temperature,
      ...utmPatch,
      modifiedAt: new Date(),
    },
  });

  scheduleInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: params.leadId,
    type: "EDIT",
    body: "Lead details updated",
    createdByUserId: user.id,
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, params.leadId);

  revalidatePath("/app/leads");
  return { ok: true, score, temperature };
}

export async function deleteInboundLead(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  await prisma.inboundLead.deleteMany({
    where: { id: leadId, organizationId: user.organizationId },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function deleteInboundLeadActivity(params: {
  leadId: string;
  activityId: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const deleted = await prisma.inboundLeadActivity.deleteMany({
    where: {
      id: params.activityId,
      leadId: params.leadId,
      organizationId: user.organizationId,
    },
  });

  if (deleted.count === 0) {
    return { ok: false, message: "Activity not found." };
  }

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function clearInboundLeadHistory(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await prisma.inboundLeadActivity.deleteMany({
    where: {
      leadId,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function addInboundLeadNote(leadId: string, note: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const trimmed = note.trim();
  if (!trimmed) {
    return { ok: false, message: "Note required." };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { discussionNotes: true },
  });
  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }

  const merged = [lead.discussionNotes?.trim(), trimmed].filter(Boolean).join("\n\n");

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { discussionNotes: merged },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "NOTE",
    body: trimmed,
    createdByUserId: user.id,
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function logLeadContactAction(leadId: string, type: "CALL" | "WHATSAPP") {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type,
    body:
      type === "CALL"
        ? "Call initiated from Leads Machine"
        : "WhatsApp opened from Leads Machine",
    createdByUserId: user.id,
  });

  return { ok: true };
}

const NURTURE_EVENT_IDS = new Set<LeadNurtureEventId>([
  "welcome",
  "assigned",
  "post_call",
  "stage_schedule_meeting",
  "stage_proposal",
  "stage_follow_up",
  "stage_qualified",
  "alert_payment_pending",
  "alert_quotation_pending",
  "alert_negotiation",
]);

export async function sendLeadNurtureWhatsAppAction(
  leadId: string,
  stepId: LeadNurtureEventId,
) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  if (!NURTURE_EVENT_IDS.has(stepId)) {
    return { ok: false, message: "Invalid nurture step." };
  }

  const result = await sendLeadNurtureStep({
    organizationId: user.organizationId,
    leadId,
    stepId,
    actorUserId: user.id,
  });

  if (!result.sent) {
    const reason =
      result.reason === "web_based_api_not_configured" ||
      result.reason === "nurture_disabled_or_not_configured"
        ? "Save Web Based API credentials and enable nurture under Leads → Settings."
        : result.reason === "web_based_api_disabled"
          ? "Enable nurture messages under Leads → Settings."
          : result.reason ?? "Could not send message.";
    return { ok: false, message: reason };
  }

  revalidatePath("/app/leads");
  return { ok: true, message: "Nurture message sent on WhatsApp." };
}

export async function scheduleInboundLeadFollowUp(params: {
  leadId: string;
  scheduledAt: string;
  notes?: string;
  assigneeUserId?: string | null;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const scheduledAt = new Date(params.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, message: "Invalid date." };
  }

  await prisma.inboundLeadFollowUp.create({
    data: {
      organizationId: user.organizationId,
      leadId: params.leadId,
      scheduledAt,
      notes: params.notes?.trim() || null,
      assigneeUserId: params.assigneeUserId || user.id,
      createdByUserId: user.id,
    },
  });

  await prisma.inboundLead.updateMany({
    where: { id: params.leadId, organizationId: user.organizationId },
    data: { nextFollowUpAt: scheduledAt, status: "FOLLOW_UP" },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: params.leadId,
    type: "FOLLOW_UP",
    body: params.notes?.trim() || `Follow-up scheduled for ${scheduledAt.toLocaleString("en-IN")}`,
    createdByUserId: user.id,
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, params.leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function completeInboundLeadFollowUp(followUpId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await prisma.inboundLeadFollowUp.updateMany({
    where: { id: followUpId, organizationId: user.organizationId },
    data: { completedAt: new Date() },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function bridgeLeadToFmsAction(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
  });

  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }

  const result = await bridgeInboundLeadToFms({
    organizationId: user.organizationId,
    lead,
    actorUserId: user.id,
  });

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "no_lead_fms_template"
          ? "Activate a Lead to Closure FMS workflow first."
          : "Could not create FMS job.",
    };
  }

  revalidatePath("/app/leads");
  return { ok: true, instanceId: result.instanceId };
}

export type LeadSyncActionResult =
  | { ok: true; message: string; imported: number; counts: LeadSyncCounts }
  | { ok: false; message: string };

export async function syncLeadChannelNow(
  channel: LeadSourceChannel,
  options?: { forceFull?: boolean },
): Promise<LeadSyncActionResult> {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(channel)) {
    return { ok: false, message: "This connector is coming soon." };
  }

  const forceFull = options?.forceFull === true;
  const result =
    channel === "GOOGLE_SHEETS"
      ? await syncLeadsTwoWay(user.organizationId, { forceFull })
      : await pullLeadsFromConnection({
          organizationId: user.organizationId,
          channel,
          forceFull,
        });

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  if (!result.ok) {
    const exportMessage =
      result.reason === "export_failed" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : null;

    return {
      ok: false,
      message: exportMessage ?? formatLeadSyncError(result.reason),
    };
  }

  const exported =
    "exported" in result && typeof result.exported === "number"
      ? result.exported
      : 0;
  const baseMessage = formatLeadSyncCounts(result.counts, result.partial);
  const message =
    exported > 0
      ? `${baseMessage} · Pushed ${exported} row${exported === 1 ? "" : "s"} to sheet`
      : baseMessage;

  return {
    ok: true,
    imported: result.imported,
    counts: result.counts,
    message,
  };
}

export async function testGoogleSheetsLeadConnection(params: {
  spreadsheetUrl: string;
  sheetTab: string;
  headerRow: number;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const config = buildGoogleSheetsLeadConfigFromInput(params);

  try {
    const result = await testLeadsGoogleSheetAccess(config);
    return {
      ok: true,
      message: `Connected via ${result.source}. Found ${result.leadCount} lead row${result.leadCount === 1 ? "" : "s"} (${result.rowCount} sheet rows).`,
      leadCount: result.leadCount,
      rowCount: result.rowCount,
      source: result.source,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not reach the Google Sheet.",
    };
  }
}

export async function updateLeadConnection(params: {
  channel: LeadSourceChannel;
  enabled: boolean;
  configJson: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(params.channel)) {
    return { ok: false, message: "This connector is coming soon." };
  }

  // Channel-specific validators own credential shape — do not bypass via raw JSON.
  if (params.channel === "WHATSAPP") {
    return setWhatsAppLeadIngestEnabled(params.enabled);
  }
  if (params.channel === "FACEBOOK" || params.channel === "INSTAGRAM") {
    return {
      ok: false,
      message:
        "Use saveMetaLeadAdsConnection for Facebook/Instagram Lead Ads credentials.",
    };
  }
  if (params.channel === "TELEGRAM") {
    return {
      ok: false,
      message: "Use saveTelegramLeadConnection for Telegram bot credentials.",
    };
  }

  await ensureLeadConnections(user.organizationId);

  let config: Record<string, unknown> = {};
  if (params.configJson.trim()) {
    try {
      config = JSON.parse(params.configJson) as Record<string, unknown>;
    } catch {
      return { ok: false, message: "Config must be valid JSON." };
    }
  }

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: params.channel,
      },
    },
    data: { enabled: params.enabled, config: config as Prisma.InputJsonValue },
  });

  revalidatePath("/app/leads/settings");
  return { ok: true };
}

export async function updateGoogleSheetsLeadConfig(params: {
  enabled: boolean;
  spreadsheetUrl: string;
  sheetTab: string;
  headerRow: number;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  await ensureLeadConnections(user.organizationId);

  const config = buildGoogleSheetsLeadConfigFromInput({
    spreadsheetUrl: params.spreadsheetUrl,
    sheetTab: params.sheetTab,
    headerRow: params.headerRow,
  });

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: "GOOGLE_SHEETS",
      },
    },
    data: {
      enabled: params.enabled,
      config: config as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/app/leads/settings");

  if (!params.enabled) {
    revalidatePath("/app/leads");
    return { ok: true, message: "Google Sheets settings saved." };
  }

  const sync = await pullLeadsFromConnection({
    organizationId: user.organizationId,
    channel: "GOOGLE_SHEETS",
  });

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  if (!sync.ok) {
    return {
      ok: false,
      message: `Saved, but sync failed: ${formatLeadSyncError(sync.reason)}`,
    };
  }

  return {
    ok: true,
    message: `Live and connected. ${formatLeadSyncCounts(sync.counts, sync.partial)}`,
    imported: sync.imported,
    counts: sync.counts,
  };
}

export async function regenerateLeadsApiKey() {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const { key, hash, hint } = generateLeadMachineApiKey();

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      leadMachineApiKeyHash: hash,
      leadMachineApiKeyHint: hint,
    },
  });

  revalidatePath("/app/leads/settings");
  return { ok: true, apiKey: key };
}

export async function createManualInboundLead(formData: FormData) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const name = formData.get("name")?.toString().trim() || "";
  const phone = formData.get("phone")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim() || "";
  const requirement = formData.get("requirement")?.toString().trim() || "";
  const company = formData.get("company")?.toString().trim() || "";
  const utmSource = formData.get("utmSource")?.toString().trim() || "";
  const utmMedium = formData.get("utmMedium")?.toString().trim() || "";
  const utmCampaign = formData.get("utmCampaign")?.toString().trim() || "";
  const utmContent = formData.get("utmContent")?.toString().trim() || "";
  const utmTerm = formData.get("utmTerm")?.toString().trim() || "";
  const campaign = formData.get("campaign")?.toString().trim() || "";
  const landingPage = formData.get("landingPage")?.toString().trim() || "";

  if (!leadPhoneDigits(phone)) {
    return {
      ok: false,
      message: "Enter a valid contact number (at least 10 digits).",
    };
  }

  const result = await ingestInboundLead({
    organizationId: user.organizationId,
    channel: "MANUAL",
    externalId: `manual-${Date.now()}`,
    name,
    phone,
    email: email || undefined,
    company: company || undefined,
    requirement,
    utmSource: utmSource || undefined,
    utmMedium: utmMedium || undefined,
    utmCampaign: utmCampaign || undefined,
    utmContent: utmContent || undefined,
    utmTerm: utmTerm || undefined,
    campaign: campaign || undefined,
    landingPage: landingPage || undefined,
    capturedAt: new Date(),
    actorUserId: user.id,
    createdByUserId: user.id,
    createFmsJob: true,
    hardBlockDuplicates: true,
  });

  if (result.duplicate && !result.lead) {
    const match = result.matches?.[0];
    return {
      ok: false as const,
      duplicate: true as const,
      message: match
        ? `Duplicate lead: ${match.name ?? "existing lead"} already uses this phone or email. Open that lead instead of creating another.`
        : "A lead with this phone or email already exists.",
      matches: result.matches ?? [],
    };
  }

  revalidatePath("/app/leads");
  return {
    ok: true as const,
    leadId: result.lead?.id,
    score: result.lead?.score ?? null,
    temperature: result.lead?.temperature ?? null,
  };
}

export async function archiveInboundLeadAction(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const updated = await prisma.inboundLead.updateMany({
    where: {
      id: leadId,
      organizationId: user.organizationId,
      archivedAt: null,
    },
    data: { archivedAt: new Date(), modifiedAt: new Date() },
  });

  if (updated.count === 0) {
    const exists = await prisma.inboundLead.findFirst({
      where: { id: leadId, organizationId: user.organizationId },
      select: { id: true, archivedAt: true },
    });
    if (!exists) {
      return { ok: false, message: "Lead not found." };
    }
    return { ok: true, alreadyArchived: true };
  }

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "EDIT",
    body: "Lead archived",
    createdByUserId: user.id,
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function unarchiveInboundLeadAction(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const updated = await prisma.inboundLead.updateMany({
    where: {
      id: leadId,
      organizationId: user.organizationId,
      archivedAt: { not: null },
    },
    data: { archivedAt: null, modifiedAt: new Date() },
  });

  if (updated.count === 0) {
    const exists = await prisma.inboundLead.findFirst({
      where: { id: leadId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!exists) {
      return { ok: false, message: "Lead not found." };
    }
    return { ok: true, alreadyActive: true };
  }

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "EDIT",
    body: "Lead unarchived",
    createdByUserId: user.id,
  });

  await recomputeAndSaveScore(leadId, user.organizationId);

  revalidatePath("/app/leads");
  return { ok: true };
}

/**
 * Merge secondary into primary (same org only). Soft-archives secondary with mergedIntoId.
 * GST/PAN not on InboundLead — phone/email/company field fill only.
 */
export async function mergeInboundLeadsAction(params: {
  primaryId: string;
  secondaryId: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "Not allowed." };
  }

  const result = await mergeInboundLeads({
    organizationId: user.organizationId,
    primaryId: params.primaryId,
    secondaryId: params.secondaryId,
    actorUserId: user.id,
  });

  if (!result.ok) {
    return result;
  }

  exportLeadToGoogleSheetAfterSave(user.organizationId, result.primaryId);
  revalidatePath("/app/leads");
  return result;
}

/** Soft company + hard phone/email duplicates for merge UI (same org). */
export async function listLeadDuplicateMatchesAction(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "STAFF")) {
    return { ok: false as const, message: "Not allowed.", matches: [] };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { phone: true, email: true, company: true },
  });
  if (!lead) {
    return { ok: false as const, message: "Lead not found.", matches: [] };
  }

  const matches = await findDuplicateLeads(user.organizationId, {
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    excludeLeadId: leadId,
    includeCompanySoft: true,
  });

  return {
    ok: true as const,
    matches: matches.filter((m) => !m.archivedAt).map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      email: m.email,
      company: m.company,
      status: m.status,
      matchKind: m.matchKind,
    })),
  };
}

/** GPT qualification summary — cached on lead.aiSummary. Soft-fails without API key. */
export async function generateLeadAiSummaryAction(
  leadId: string,
  opts?: { force?: boolean },
) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "Not allowed." };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      email: true,
      requirement: true,
      discussionNotes: true,
      meetingNotes: true,
      category: true,
      status: true,
      pipeValue: true,
      quotationValue: true,
      temperature: true,
      score: true,
      sourceDetail: true,
      campaign: true,
      aiSummary: true,
      aiSummaryAt: true,
    },
  });
  if (!lead) {
    return { ok: false as const, message: "Lead not found." };
  }

  const cacheFreshMs = 6 * 60 * 60 * 1000;
  if (
    !opts?.force &&
    lead.aiSummary?.trim() &&
    lead.aiSummaryAt &&
    Date.now() - lead.aiSummaryAt.getTime() < cacheFreshMs
  ) {
    return {
      ok: true as const,
      summary: lead.aiSummary,
      cached: true as const,
      aiSummaryAt: lead.aiSummaryAt.toISOString(),
    };
  }

  const rate = await checkRateLimit(
    `leads-ai:${user.organizationId}:${user.id}`,
    20,
    60_000,
  );
  if (!rate.allowed) {
    return {
      ok: false as const,
      message: `Rate limit exceeded. Retry in ${rate.retryAfterSec}s.`,
    };
  }

  const orgQuota = await checkTaskAiOrgQuota(user.organizationId);
  if (!orgQuota.allowed) {
    return { ok: false as const, message: orgQuota.message };
  }

  if (!getIntegrationStatus().openai) {
    return {
      ok: false as const,
      message:
        "AI summary unavailable — add OPENAI_API_KEY or try again later.",
    };
  }

  try {
    const { summary, usage } = await generateLeadQualificationSummary({
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      requirement: lead.requirement,
      discussionNotes: lead.discussionNotes,
      meetingNotes: lead.meetingNotes,
      category: lead.category,
      status: lead.status,
      pipeValue: lead.pipeValue?.toString() ?? null,
      quotationValue: lead.quotationValue?.toString() ?? null,
      temperature: lead.temperature,
      score: lead.score,
      sourceDetail: lead.sourceDetail,
      campaign: lead.campaign,
    });

    const aiSummaryAt = new Date();
    await prisma.inboundLead.updateMany({
      where: { id: leadId, organizationId: user.organizationId },
      data: { aiSummary: summary, aiSummaryAt, modifiedAt: new Date() },
    });

    await recordTaskAiUsage({
      organizationId: user.organizationId,
      userId: user.id,
      route: "parse",
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
    });

    revalidatePath("/app/leads");
    return {
      ok: true as const,
      summary,
      cached: false as const,
      aiSummaryAt: aiSummaryAt.toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI failed";
    if (message === "OPENAI_NOT_CONFIGURED") {
      return {
        ok: false as const,
        message:
          "AI summary unavailable — add OPENAI_API_KEY or try again later.",
      };
    }
    return {
      ok: false as const,
      message: message.startsWith("OPENAI_ERROR:")
        ? message.replace(/^OPENAI_ERROR:/, "")
        : "Could not generate AI summary.",
    };
  }
}

export async function applyAiSuggestedLeadStatus(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { requirement: true, aiSuggestedStatus: true },
  });
  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }

  const nextStatus =
    lead.aiSuggestedStatus ?? inferLeadStageFromRequirement(lead.requirement);

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { status: nextStatus },
  });

  await recomputeAndSaveScore(leadId, user.organizationId);

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "STATUS_CHANGE",
    body: `AI applied status: ${leadStatusLabel(nextStatus)}`,
    createdByUserId: user.id,
  });

  revalidatePath("/app/leads");
  return { ok: true, status: nextStatus };
}

export async function updateLeadMeetingNotes(leadId: string, meetingNotes: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const trimmed = meetingNotes.trim();
  const existing = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { callingStatus: true },
  });
  if (!existing) {
    return { ok: false, message: "Lead not found." };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: {
      meetingNotes: trimmed || null,
      modifiedAt: new Date(),
      ...(trimmed ? { status: "MEETING_NOTES" as const } : {}),
    },
  });

  if (trimmed) {
    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId,
      type: "MEETING",
      body: trimmed,
      createdByUserId: user.id,
    });

    if (existing.callingStatus !== "NOT_CALLED") {
      queueLeadNurtureAfterCall({
        organizationId: user.organizationId,
        leadId,
        discussionSummary: trimmed,
        actorUserId: user.id,
      });
    }
  }

  exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

/**
 * Schedule a client meeting from the CRM Meeting tab only.
 * Sets DEMO_SCHEDULED + nextFollowUpAt, emails the client a calendar link.
 * Does not use Google Calendar OAuth / Calendar product UI.
 */
export async function scheduleLeadClientMeeting(params: {
  leadId: string;
  startsAt: string;
  durationMinutes?: number;
  clientEmail?: string;
  meetUrl?: string;
  notes?: string;
  sendEmail?: boolean;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "Not allowed." };
  }

  const startsAt = new Date(params.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false as const, message: "Pick a valid meeting date & time." };
  }
  if (startsAt.getTime() < Date.now() - 5 * 60_000) {
    return { ok: false as const, message: "Meeting time must be in the future." };
  }

  const durationRaw = params.durationMinutes ?? 45;
  const durationMinutes = [30, 45, 60, 90].includes(durationRaw)
    ? durationRaw
    : 45;

  const lead = await prisma.inboundLead.findFirst({
    where: { id: params.leadId, organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      requirement: true,
      meetingNotes: true,
      assignedTo: { select: { name: true } },
    },
  });
  if (!lead) {
    return { ok: false as const, message: "Lead not found." };
  }

  const toEmail = (params.clientEmail?.trim() || lead.email?.trim() || "").toLowerCase();
  const shouldEmail = params.sendEmail !== false;
  if (shouldEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return {
      ok: false as const,
      message: "Add a valid client email to send the meeting link.",
    };
  }

  const meetUrl = params.meetUrl?.trim() || null;
  const scheduleNote = params.notes?.trim() || null;
  const mergedNotes = [lead.meetingNotes?.trim(), scheduleNote]
    .filter(Boolean)
    .join("\n\n");

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true },
  });

  await prisma.inboundLead.updateMany({
    where: { id: lead.id, organizationId: user.organizationId },
    data: {
      nextFollowUpAt: startsAt,
      status: "DEMO_SCHEDULED",
      ...(mergedNotes ? { meetingNotes: mergedNotes } : {}),
      ...(toEmail && !lead.email?.trim() ? { email: toEmail } : {}),
      modifiedAt: new Date(),
    },
  });

  // Optional follow-up row for history — keep status DEMO_SCHEDULED (do not use scheduleInboundLeadFollowUp).
  await prisma.inboundLeadFollowUp.create({
    data: {
      organizationId: user.organizationId,
      leadId: lead.id,
      scheduledAt: startsAt,
      notes:
        scheduleNote ||
        `Client meeting scheduled (${durationMinutes} min)${meetUrl ? ` · ${meetUrl}` : ""}`,
      assigneeUserId: user.id,
      createdByUserId: user.id,
    },
  });

  const invite = buildClientMeetingInviteEmail({
    clientName: lead.name,
    organizationName: organization?.name?.trim() || "Sheetomatic",
    startsAt,
    durationMinutes,
    meetUrl,
    notes: scheduleNote,
    counsellorName: lead.assignedTo?.name ?? user.name ?? null,
  });

  let emailSent = false;
  let emailMessage: string | null = null;
  if (shouldEmail) {
    const result = await sendPlainEmail({
      toEmail,
      subject: invite.subject,
      text: invite.text,
    });
    if (!result.sent) {
      emailMessage =
        result.reason === "not_configured"
          ? "Meeting saved, but email is not configured (RESEND_API_KEY / TASK_EMAIL_FROM)."
          : `Meeting saved, but email failed: ${result.detail ?? result.reason}`;
    } else {
      emailSent = true;
    }
  }

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: lead.id,
    type: "MEETING",
    body: [
      `Meeting scheduled for ${invite.whenLabel}`,
      meetUrl ? `Join: ${meetUrl}` : null,
      emailSent ? `Invite emailed to ${toEmail}` : null,
      !emailSent && shouldEmail ? emailMessage : null,
      scheduleNote,
    ]
      .filter(Boolean)
      .join(" · "),
    createdByUserId: user.id,
    metadata: {
      meetingScheduled: true,
      startsAt: startsAt.toISOString(),
      durationMinutes,
      calendarUrl: invite.calendarUrl,
      emailSent,
    },
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, lead.id);
  revalidatePath("/app/leads");

  return {
    ok: true as const,
    emailSent,
    calendarUrl: invite.calendarUrl,
    whenLabel: invite.whenLabel,
    message: emailSent
      ? `Meeting scheduled and invite sent to ${toEmail}.`
      : emailMessage || "Meeting scheduled.",
  };
}

export async function updateLeadCallingStatus(
  leadId: string,
  callingStatus: LeadCallingStatus,
  callNotes?: string,
) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const existing = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: {
      callingStatus: true,
      meetingNotes: true,
      discussionNotes: true,
      status: true,
    },
  });
  if (!existing) {
    return { ok: false, message: "Lead not found." };
  }

  const notes = callNotes?.trim();
  const patch: {
    callingStatus: LeadCallingStatus;
    modifiedAt: Date;
    meetingNotes?: string | null;
    status?: InboundLeadStatus;
  } = {
    callingStatus,
    modifiedAt: new Date(),
  };

  if (notes) {
    patch.meetingNotes = notes;
  }

  if (callingStatus === "CONNECTED") {
    patch.status = existing.status === "NEW" ? "CONTACTED" : existing.status;
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: patch,
  });

  const scored = await recomputeAndSaveScore(leadId, user.organizationId);

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "CALL",
    body: notes
      ? `Call status: ${callingStatus.replaceAll("_", " ")} — ${notes}`
      : `Call status: ${callingStatus.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  const shouldSendPostCall =
    callingStatus === "CONNECTED" ||
    callingStatus === "NO_ANSWER" ||
    (callingStatus === "NOT_INTERESTED" && notes);

  if (shouldSendPostCall && callingStatus !== existing.callingStatus) {
    queueLeadNurtureAfterCall({
      organizationId: user.organizationId,
      leadId,
      discussionSummary: notes ?? existing.meetingNotes ?? existing.discussionNotes,
      actorUserId: user.id,
    });
  }

  exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return {
    ok: true,
    score: scored?.score ?? null,
    temperature: scored?.temperature ?? null,
  };
}

export async function updateLeadProjectStatus(
  leadId: string,
  projectStatus: LeadProjectStatus,
) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const result = await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: {
      projectStatus,
      modifiedAt: new Date(),
      ...(projectStatus === "IN_PROGRESS" ? { status: "PROJECT_ACTIVE" as const } : {}),
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Lead not found." };
  }

  scheduleInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "STATUS_CHANGE",
    body: `Project status changed to ${projectStatus.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function addInboundLeadPayment(params: {
  leadId: string;
  paymentType: LeadPaymentType;
  receivedAmount: string;
  receivedDate: string;
  paymentMethod: LeadPaymentMethod;
  notes?: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const amount = Number.parseFloat(params.receivedAmount);
  const receivedDate = new Date(params.receivedDate);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (Number.isNaN(receivedDate.getTime())) {
    return { ok: false, message: "Invalid payment date." };
  }

  await prisma.inboundLeadPayment.create({
    data: {
      organizationId: user.organizationId,
      leadId: params.leadId,
      paymentType: params.paymentType,
      receivedAmount: amount,
      receivedDate,
      paymentMethod: params.paymentMethod,
      notes: params.notes?.trim() || null,
    },
  });

  let lockedQuotationNumber: string | null = null;
  let salesOrderNumber: string | null = null;
  if (params.paymentType === "ADVANCE") {
    const latestQuotation = await prisma.inboundLeadQuotation.findFirst({
      where: {
        organizationId: user.organizationId,
        leadId: params.leadId,
        status: { in: ["DRAFT", "SENT", "REVISED"] },
        lockedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, advanceRequired: true, quotationNumber: true },
    });

    if (latestQuotation?.advanceRequired != null) {
      const required = Number(latestQuotation.advanceRequired);
      if (amount < required) {
        return {
          ok: false,
          message: `Advance must be at least ₹${required.toLocaleString("en-IN")} per ${latestQuotation.quotationNumber}.`,
        };
      }
    }

    const locked = await lockLatestLeadQuotation(
      user.organizationId,
      params.leadId,
      amount,
    );
    if (locked) {
      lockedQuotationNumber = locked.quotationNumber;
      await logInboundLeadActivity({
        organizationId: user.organizationId,
        leadId: params.leadId,
        type: "QUOTATION",
        body: `${locked.quotationNumber} locked after advance payment of ₹${amount.toLocaleString("en-IN")}`,
        createdByUserId: user.id,
        metadata: { quotationId: locked.id, locked: true },
      });

      try {
        const salesOrder = await createSalesOrderFromLockedQuotation({
          organizationId: user.organizationId,
          leadId: params.leadId,
          quotationId: locked.id,
          advanceAmount: amount,
          actorUserId: user.id,
        });
        salesOrderNumber = salesOrder.orderNumber;
      } catch (error) {
        console.error("createSalesOrderFromLockedQuotation", error);
      }
    }
  }

  await prisma.inboundLead.updateMany({
    where: { id: params.leadId, organizationId: user.organizationId },
    data: { status: "PAYMENT" },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: params.leadId,
    type: "PAYMENT",
    body: `₹${amount.toLocaleString("en-IN")} · ${params.paymentType.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  revalidatePath("/app/leads");
  revalidatePath("/app/sales-orders");
  return {
    ok: true,
    lockedQuotationNumber,
    salesOrderNumber,
  };
}

function parsePaymentMoney(raw: string) {
  const amount = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

/** Add or update a client on CRM Payment Follow-up for portal WA collection. */
export async function upsertPaymentFollowUpClient(formData: FormData) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "Not allowed." };
  }

  const leadId = formData.get("leadId")?.toString().trim() || "";
  const name = formData.get("name")?.toString().trim() || "";
  const phone = formData.get("phone")?.toString().trim() || "";
  const company = formData.get("company")?.toString().trim() || "";
  const total = parsePaymentMoney(formData.get("paymentTotal")?.toString() ?? "");
  const received = parsePaymentMoney(formData.get("paymentReceived")?.toString() ?? "0");
  const lastDateRaw = formData.get("paymentLastDate")?.toString().trim() || "";
  const lastDate = lastDateRaw ? new Date(`${lastDateRaw}T12:00:00`) : null;

  if (total == null || total <= 0) {
    return { ok: false as const, message: "Enter a valid Total Payment." };
  }
  if (received == null) {
    return { ok: false as const, message: "Enter a valid Received Payment (0 allowed)." };
  }
  if (received > total) {
    return { ok: false as const, message: "Received cannot be greater than Total." };
  }
  if (!lastDate || Number.isNaN(lastDate.getTime())) {
    return { ok: false as const, message: "Enter Last Date of Payment." };
  }
  if (!leadId && !leadPhoneDigits(phone)) {
    return {
      ok: false as const,
      message: "Enter a valid WhatsApp / contact number (at least 10 digits).",
    };
  }

  let targetLeadId = leadId;

  if (targetLeadId) {
    const existing = await prisma.inboundLead.findFirst({
      where: { id: targetLeadId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false as const, message: "Lead not found." };
    }
  } else {
    const result = await ingestInboundLead({
      organizationId: user.organizationId,
      channel: "MANUAL",
      externalId: `payment-fu-${Date.now()}`,
      name: name || company || "Payment client",
      phone,
      company: company || undefined,
      requirement: "Payment follow-up",
      capturedAt: new Date(),
      actorUserId: user.id,
      createdByUserId: user.id,
      createFmsJob: false,
      hardBlockDuplicates: false,
    });
    if (!result.lead?.id) {
      // Prefer attaching to an existing duplicate match by phone.
      const matchId = result.matches?.[0]?.id;
      if (!matchId) {
        return {
          ok: false as const,
          message: result.duplicate
            ? "A lead with this phone already exists — open it and add to Payment Follow-up."
            : "Could not create client.",
        };
      }
      targetLeadId = matchId;
    } else {
      targetLeadId = result.lead.id;
    }
  }

  await prisma.inboundLead.updateMany({
    where: { id: targetLeadId, organizationId: user.organizationId },
    data: {
      paymentFollowUp: true,
      paymentTotal: total,
      paymentReceived: received,
      paymentLastDate: lastDate,
      ...(name ? { name } : {}),
      ...(company ? { company } : {}),
      ...(phone && leadPhoneDigits(phone) ? { phone } : {}),
      status: "INVOICE",
      modifiedAt: new Date(),
    },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: targetLeadId,
    type: "PAYMENT",
    body: `Payment Follow-up updated · Total ₹${total.toLocaleString("en-IN")} · Received ₹${received.toLocaleString("en-IN")} · Due ₹${(total - received).toLocaleString("en-IN")} · Last date ${lastDate.toLocaleDateString("en-IN")}`,
    createdByUserId: user.id,
  });

  revalidatePath("/app/leads");
  return { ok: true as const, leadId: targetLeadId };
}

export async function removePaymentFollowUpClient(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "Not allowed." };
  }

  const updated = await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: {
      paymentFollowUp: false,
      modifiedAt: new Date(),
    },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "Lead not found." };
  }

  revalidatePath("/app/leads");
  return { ok: true as const };
}

export async function addLeadOfferedService(params: {
  leadId: string;
  catalogId: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const catalog = await prisma.leadServiceCatalog.findFirst({
    where: { id: params.catalogId, organizationId: user.organizationId },
  });
  if (!catalog) {
    return { ok: false, message: "Service not found." };
  }

  await prisma.inboundLeadOfferedService.create({
    data: {
      organizationId: user.organizationId,
      leadId: params.leadId,
      catalogId: catalog.id,
      serviceCategory: catalog.serviceCategory,
      subCategory: catalog.subCategory,
      unitPrice: catalog.unitPrice,
    },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function createLeadServiceCatalogItem(params: {
  serviceCategory: string;
  subCategory: string;
  unitPrice?: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const serviceCategory = params.serviceCategory.trim();
  const subCategory = params.subCategory.trim();
  if (!serviceCategory || !subCategory) {
    return { ok: false, message: "Category and service name are required." };
  }

  const parsedPrice = params.unitPrice?.trim()
    ? Number.parseFloat(params.unitPrice)
    : null;
  const unitPrice =
    parsedPrice != null && Number.isFinite(parsedPrice) && parsedPrice >= 0
      ? parsedPrice
      : null;

  const existing = await prisma.leadServiceCatalog.findFirst({
    where: {
      organizationId: user.organizationId,
      serviceCategory,
      subCategory,
    },
  });
  if (existing) {
    revalidatePath("/app/leads");
    return {
      ok: true,
      item: {
        id: existing.id,
        serviceCategory: existing.serviceCategory,
        subCategory: existing.subCategory,
        unitPrice: existing.unitPrice != null ? Number(existing.unitPrice) : null,
      },
      message: "Service already exists in catalog.",
    };
  }

  const maxSort = await prisma.leadServiceCatalog.aggregate({
    where: { organizationId: user.organizationId },
    _max: { sortOrder: true },
  });

  const item = await prisma.leadServiceCatalog.create({
    data: {
      organizationId: user.organizationId,
      serviceCategory,
      subCategory,
      unitPrice,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/app/leads");
  return {
    ok: true,
    item: {
      id: item.id,
      serviceCategory: item.serviceCategory,
      subCategory: item.subCategory,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
    },
  };
}

export async function createLeadQuotation(params: {
  leadId: string;
  requestType: QuotationRequestType;
  projectStartDate?: string;
  durationDays?: string;
  notes?: string;
  scopeNotes?: string;
  paymentTerms?: string;
  advanceRequired?: string;
  company?: string;
  address?: string;
  zipCode?: string;
  lineCatalogIds: string[];
  lineItems?: Array<{ catalogId: string; unitPrice: string; quantity?: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: params.leadId, organizationId: user.organizationId },
    include: { offeredServices: true },
  });
  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }

  const catalogIds =
    params.lineItems && params.lineItems.length > 0
      ? params.lineItems.map((item) => item.catalogId)
      : params.lineCatalogIds.length > 0
        ? params.lineCatalogIds
        : (lead.offeredServices.map((item) => item.catalogId).filter(Boolean) as string[]);

  const catalog = await prisma.leadServiceCatalog.findMany({
    where: { organizationId: user.organizationId, id: { in: catalogIds } },
  });
  if (catalog.length === 0) {
    return { ok: false, message: "Add at least one offered service first." };
  }

  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const lineInputs =
    params.lineItems && params.lineItems.length > 0
      ? params.lineItems
      : catalogIds.map((catalogId) => ({ catalogId, unitPrice: "0", quantity: "1" }));

  const lines = lineInputs.flatMap((input) => {
    const item = catalogById.get(input.catalogId);
    if (!item) {
      return [];
    }
    const unitPrice = Number.parseFloat(input.unitPrice);
    const quantity = Number.parseInt(input.quantity ?? "1", 10);
    const price = Number.isFinite(unitPrice) ? unitPrice : 0;
    const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    return [
      {
        serviceCategory: item.serviceCategory,
        subCategory: item.subCategory,
        quantity: qty,
        unitPrice: price,
        lineTotal: price * qty,
      },
    ];
  });

  if (lines.length === 0) {
    return { ok: false, message: "Add at least one valid line item." };
  }

  const hasPricedLine = lines.some((line) => line.lineTotal > 0);
  if (!hasPricedLine) {
    return { ok: false, message: "Enter an amount for at least one line item." };
  }

  const totals = computeQuotationTotals(lines);
  const quotationNumber = await nextQuotationNumber(user.organizationId);
  const durationDays = Number.parseInt(params.durationDays ?? "", 10);
  const quotationDate = new Date();
  const projectStartDate = parseQuotationStartDate(params.projectStartDate, quotationDate);
  const endDate = computeQuotationEndDate(projectStartDate, durationDays);

  const advanceRequired = Number.parseFloat(params.advanceRequired ?? "");
  const quotation = await prisma.inboundLeadQuotation.create({
    data: {
      organizationId: user.organizationId,
      leadId: lead.id,
      quotationNumber,
      requestType: params.requestType,
      status: "DRAFT",
      revisionNumber: 1,
      company: params.company?.trim() || lead.company,
      address: params.address?.trim() || lead.address,
      zipCode: params.zipCode?.trim() || lead.zipCode,
      quotationDate,
      projectStartDate,
      durationDays: Number.isFinite(durationDays) ? durationDays : null,
      endDate,
      subtotal: totals.subtotal,
      totalAmount: totals.totalAmount,
      advanceRequired: Number.isFinite(advanceRequired) ? advanceRequired : null,
      scopeNotes: params.scopeNotes?.trim() || lead.requirement || null,
      paymentTerms:
        params.paymentTerms?.trim() ||
        paymentTermsForRequestType(params.requestType),
      notes: params.notes?.trim() || null,
      shareToken: createQuotationShareToken(),
      createdByUserId: user.id,
      lines: { create: lines },
    },
  });

  await prisma.inboundLead.updateMany({
    where: { id: lead.id, organizationId: user.organizationId },
    data: {
      status: params.requestType === "INVOICE" ? "INVOICE" : "PROPOSAL",
      quotationValue: totals.totalAmount,
    },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: lead.id,
    type: "QUOTATION",
    body: `${quotationNumber} · ${params.requestType} · ₹${totals.totalAmount.toLocaleString("en-IN")}`,
    createdByUserId: user.id,
    metadata: { quotationId: quotation.id },
  });

  revalidatePath("/app/leads");
  return { ok: true, quotationId: quotation.id, quotationNumber };
}

export async function markLeadQuotationSent(quotationId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const quotation = await prisma.inboundLeadQuotation.findFirst({
    where: { id: quotationId, organizationId: user.organizationId },
    select: { id: true, status: true, lockedAt: true, shareToken: true },
  });
  if (!quotation) {
    return { ok: false, message: "Quotation not found." };
  }
  if (quotation.lockedAt) {
    return { ok: false, message: "Quotation is locked." };
  }

  await prisma.inboundLeadQuotation.update({
    where: { id: quotation.id },
    data: {
      sentAt: new Date(),
      status: quotation.status === "DRAFT" ? "SENT" : quotation.status,
      shareToken: quotation.shareToken ?? createQuotationShareToken(),
    },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function reviseLeadQuotation(quotationId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const source = await prisma.inboundLeadQuotation.findFirst({
    where: { id: quotationId, organizationId: user.organizationId },
    include: { lines: true, lead: true },
  });
  if (!source) {
    return { ok: false, message: "Quotation not found." };
  }
  if (source.lockedAt || source.status === "LOCKED") {
    return { ok: false, message: "Locked quotations cannot be revised." };
  }

  const revisionNumber = source.revisionNumber + 1;
  const quotationNumber = revisionQuotationNumber(
    source.quotationNumber,
    revisionNumber,
  );

  const quotation = await prisma.$transaction(async (tx) => {
    await tx.inboundLeadQuotation.update({
      where: { id: source.id },
      data: { status: "REVISED" },
    });

    return tx.inboundLeadQuotation.create({
      data: {
        organizationId: user.organizationId,
        leadId: source.leadId,
        quotationNumber,
        requestType: source.requestType,
        status: "DRAFT",
        revisionNumber,
        revisedFromQuotationId: source.id,
        company: source.company,
        address: source.address,
        zipCode: source.zipCode,
        quotationDate: new Date(),
        projectStartDate: source.projectStartDate,
        durationDays: source.durationDays,
        endDate: source.endDate,
        subtotal: source.subtotal,
        totalAmount: source.totalAmount,
        advanceRequired: source.advanceRequired,
        scopeNotes: source.scopeNotes,
        paymentTerms: source.paymentTerms,
        notes: source.notes,
        shareToken: createQuotationShareToken(),
        createdByUserId: user.id,
        lines: {
          create: source.lines.map((line) => ({
            serviceCategory: line.serviceCategory,
            subCategory: line.subCategory,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: source.leadId,
    type: "QUOTATION",
    body: `Revised ${source.quotationNumber} → ${quotationNumber}`,
    createdByUserId: user.id,
    metadata: { quotationId: quotation.id, revisedFrom: source.id },
  });

  revalidatePath("/app/leads");
  return { ok: true, quotationId: quotation.id, quotationNumber };
}

async function getQuotationForShare(organizationId: string, quotationId: string) {
  return prisma.inboundLeadQuotation.findFirst({
    where: { id: quotationId, organizationId },
    include: {
      lead: { select: { name: true, phone: true, email: true } },
    },
  });
}

export async function sendLeadQuotationWhatsApp(quotationId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const quotation = await getQuotationForShare(user.organizationId, quotationId);
  if (!quotation) {
    return { ok: false, message: "Quotation not found." };
  }
  if (quotation.lockedAt) {
    return { ok: false, message: "Quotation is locked." };
  }

  const shareToken =
    quotation.shareToken ??
    (
      await prisma.inboundLeadQuotation.update({
        where: { id: quotation.id },
        data: { shareToken: createQuotationShareToken() },
        select: { shareToken: true },
      })
    ).shareToken;

  const publicUrl = buildQuotationPublicUrl(shareToken!);
  const message = buildQuotationShareMessage({
    clientName: quotation.lead.name || "there",
    quotationNumber: quotation.quotationNumber,
    requestType: quotation.requestType,
    totalAmount: Number(quotation.totalAmount),
    publicUrl,
    revisionNumber: quotation.revisionNumber,
  });

  const phone = quotation.lead.phone?.replace(/\D/g, "") ?? "";
  if (!phone) {
    return { ok: false, message: "Lead has no phone number for WhatsApp." };
  }

  await markLeadQuotationSent(quotationId);

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return { ok: true, waUrl, publicUrl };
}

export async function sendLeadQuotationEmail(quotationId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const quotation = await getQuotationForShare(user.organizationId, quotationId);
  if (!quotation) {
    return { ok: false, message: "Quotation not found." };
  }
  if (!quotation.lead.email?.trim()) {
    return { ok: false, message: "Lead has no email address." };
  }
  if (quotation.lockedAt) {
    return { ok: false, message: "Quotation is locked." };
  }

  const shareToken =
    quotation.shareToken ??
    (
      await prisma.inboundLeadQuotation.update({
        where: { id: quotation.id },
        data: { shareToken: createQuotationShareToken() },
        select: { shareToken: true },
      })
    ).shareToken;

  const publicUrl = buildQuotationPublicUrl(shareToken!);
  const docType = quotation.requestType === "INVOICE" ? "Invoice" : "Proposal";
  const subject = `Sheetomatic ${docType} ${quotation.quotationNumber}`;
  const text = buildQuotationShareMessage({
    clientName: quotation.lead.name || "there",
    quotationNumber: quotation.quotationNumber,
    requestType: quotation.requestType,
    totalAmount: Number(quotation.totalAmount),
    publicUrl,
    revisionNumber: quotation.revisionNumber,
  });

  const result = await sendPlainEmail({
    toEmail: quotation.lead.email.trim(),
    subject,
    text,
  });

  if (!result.sent) {
    return {
      ok: false,
      message:
        result.reason === "not_configured"
          ? "Email is not configured (RESEND_API_KEY / TASK_EMAIL_FROM)."
          : `Email failed: ${result.detail ?? result.reason}`,
    };
  }

  await markLeadQuotationSent(quotationId);

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: quotation.leadId,
    type: "QUOTATION",
    body: `Emailed ${quotation.quotationNumber} to ${quotation.lead.email}`,
    createdByUserId: user.id,
    metadata: { quotationId: quotation.id },
  });

  revalidatePath("/app/leads");
  return { ok: true, publicUrl };
}

export async function deleteLeadQuotation(quotationId: string) {
  const user = await requireSession("MANAGER", { module: "CRM" });

  const quotation = await prisma.inboundLeadQuotation.findFirst({
    where: { id: quotationId, organizationId: user.organizationId },
    select: { id: true, lockedAt: true, status: true },
  });

  if (!quotation) {
    return { ok: false, message: "Quotation not found." };
  }
  if (quotation.lockedAt || quotation.status === "LOCKED") {
    return { ok: false, message: "Locked quotations cannot be deleted." };
  }

  await prisma.inboundLeadQuotation.delete({
    where: { id: quotationId },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

function pickLeadsSecretField(next: string, existing: string | null | undefined) {
  const trimmed = next.trim();
  if (!trimmed) {
    return existing ?? null;
  }
  return trimmed;
}

export async function saveLeadsWebBasedApiSettings(
  _prev: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const existing = await prisma.workspaceWhatsAppSettings.findUnique({
    where: { organizationId: user.organizationId },
  });

  const masUsername =
    formData.get("masUsername")?.toString().trim() ||
    existing?.masUsername ||
    "";
  const masPassword = pickLeadsSecretField(
    formData.get("masPassword")?.toString() ?? "",
    existing?.masPassword,
  );
  const masApiKey = pickLeadsSecretField(
    formData.get("masApiKey")?.toString() ?? "",
    existing?.masApiKey,
  );

  // businessPhone on this form is reference-only for the personal/WBA line.
  // Never overwrite Official Cloud businessPhone from nurture credentials.

  if (!masUsername) {
    return { ok: false, message: "Username is required." };
  }
  if (!masPassword) {
    return {
      ok: false,
      message: "Password is required (or save once and leave blank later).",
    };
  }
  if (!masApiKey) {
    return {
      ok: false,
      message: "API key is required (or save once and leave blank later).",
    };
  }

  // Nurture-only MAS credentials. Never flip Official/SHEETOMATIC provider or
  // overwrite Cloud businessPhone with the personal/WBA communication number.
  await prisma.workspaceWhatsAppSettings.upsert({
    where: { organizationId: user.organizationId },
    create: {
      organizationId: user.organizationId,
      whatsappProvider: "SHEETOMATIC",
      masUsername,
      masPassword,
      masApiKey,
    },
    update: {
      masUsername,
      masPassword,
      masApiKey,
    },
  });

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");
  revalidatePath("/ai/app/settings");

  return {
    ok: true,
    message: "Web Based API credentials saved for nurture sends.",
  };
}

export async function saveLeadsNurtureSettings(
  _prev: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const existing = await getLeadNurtureConfig(user.organizationId);
  const enabled = formData.get("nurtureEnabled") === "true";
  const gapRaw = Number.parseInt(
    formData.get("stageMinGapHours")?.toString() ?? "",
    10,
  );
  const stageMinGapHours =
    Number.isFinite(gapRaw) && gapRaw >= 0 ? Math.min(gapRaw, 168) : existing.stageMinGapHours;

  const templates: Partial<Record<LeadNurtureEventId, string>> = {
    ...existing.templates,
  };
  for (const eventId of NURTURE_EVENT_ORDER) {
    const value = formData.get(`template_${eventId}`)?.toString() ?? "";
    if (value.trim()) {
      templates[eventId] = value.trim();
    }
  }

  const parseRule = (
    key: "paymentNotReceived" | "quotationNotAccepted" | "negotiationFollowUp",
    fallback: { enabled: boolean; afterDays: number },
  ) => {
    const enabled = formData.get(`alert_${key}_enabled`) === "true";
    const daysRaw = Number.parseInt(
      formData.get(`alert_${key}_days`)?.toString() ?? "",
      10,
    );
    return {
      enabled,
      afterDays:
        Number.isFinite(daysRaw) && daysRaw >= 1
          ? Math.min(daysRaw, 90)
          : fallback.afterDays,
    };
  };

  const config: LeadNurtureOrgConfig = parseLeadNurtureConfig({
    enabled,
    stageMinGapHours,
    templates,
    alerts: {
      paymentNotReceived: parseRule(
        "paymentNotReceived",
        existing.alerts.paymentNotReceived,
      ),
      quotationNotAccepted: parseRule(
        "quotationNotAccepted",
        existing.alerts.quotationNotAccepted,
      ),
      negotiationFollowUp: parseRule(
        "negotiationFollowUp",
        existing.alerts.negotiationFollowUp,
      ),
    },
  });

  await saveLeadNurtureConfig(user.organizationId, config);

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  return {
    ok: true,
    message: enabled
      ? "Nurture + alert messages saved. WhatsApp will send on lead events and overdue commercial alerts."
      : "Nurture + alert messages saved. Automatic sending is paused.",
  };
}

export async function setWhatsAppLeadIngestEnabled(enabled: boolean) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  await ensureLeadConnections(user.organizationId);

  if (enabled) {
    const creds = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
    const phoneId = creds.redlavaPhoneId?.trim();
    const hasOfficial = Boolean(
      phoneId && creds.metaAccessToken?.trim(),
    );
    if (!hasOfficial) {
      return {
        ok: false,
        message:
          "Configure Official API (Meta Cloud access token + phone number ID) in WhatsApp settings first.",
      };
    }
  }

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: "WHATSAPP",
      },
    },
    data: {
      enabled,
      lastSyncError: null,
      syncStatus: "IDLE",
      label: "WhatsApp Official API intake",
    },
  });

  revalidatePath("/app/leads/settings");
  revalidatePath("/app/leads");
  return {
    ok: true,
    message: enabled
      ? "WhatsApp Official API lead intake enabled."
      : "WhatsApp lead intake disabled.",
  };
}

export async function saveMetaLeadAdsConnection(params: {
  channel: "FACEBOOK" | "INSTAGRAM";
  enabled: boolean;
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  formIds: string;
  appSecret: string;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (params.channel !== "FACEBOOK" && params.channel !== "INSTAGRAM") {
    return { ok: false, message: "Invalid channel." };
  }

  await ensureLeadConnections(user.organizationId);

  const existing = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: params.channel,
      },
    },
  });

  const verifyToken =
    params.verifyToken.trim() ||
    defaultMetaVerifyTokenForOrg(existing?.config);

  const config = mergeMetaLeadAdsConfig({
    existing: existing?.config,
    pageId: params.pageId,
    pageAccessToken: params.pageAccessToken,
    verifyToken,
    formIds: params.formIds,
    appSecret: params.appSecret,
    keepExistingToken: true,
  });

  if (!config.pageId) {
    return { ok: false, message: "Page ID is required." };
  }
  if (!config.pageAccessToken) {
    return { ok: false, message: "Page access token is required." };
  }

  if (params.enabled) {
    const verified = await verifyMetaPageAccessToken({
      pageId: config.pageId,
      pageAccessToken: config.pageAccessToken,
    });
    if (!verified.ok) {
      return {
        ok: false,
        message: `Token check failed: ${verified.message}`,
      };
    }
  }

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: params.channel,
      },
    },
    data: {
      enabled: params.enabled,
      config: config as Prisma.InputJsonValue,
      lastSyncError: null,
      syncStatus: "IDLE",
      label:
        params.channel === "FACEBOOK"
          ? "Facebook Lead Ads"
          : "Instagram Lead Ads",
    },
  });

  revalidatePath("/app/leads/settings");
  revalidatePath("/app/leads");
  return {
    ok: true,
    message: params.enabled
      ? `${params.channel === "FACEBOOK" ? "Facebook" : "Instagram"} Lead Ads connected.`
      : "Settings saved (intake disabled).",
    verifyToken: config.verifyToken,
    webhookUrl: metaLeadWebhookUrl(),
  };
}

export async function verifyMetaLeadAdsConnection(channel: "FACEBOOK" | "INSTAGRAM") {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel,
      },
    },
  });
  const config = parseMetaLeadAdsConfig(connection?.config);
  if (!config) {
    return { ok: false, message: "Save Page ID and access token first." };
  }

  const verified = await verifyMetaPageAccessToken({
    pageId: config.pageId,
    pageAccessToken: config.pageAccessToken,
  });

  await prisma.leadIngestConnection.update({
    where: { id: connection!.id },
    data: verified.ok
      ? { lastSyncError: null, syncStatus: "IDLE" }
      : {
          lastSyncError: verified.message,
          syncStatus: "ERROR",
        },
  });

  revalidatePath("/app/leads/settings");
  return verified.ok
    ? { ok: true, message: `Verified page: ${verified.pageName}` }
    : { ok: false, message: verified.message };
}

export async function saveTelegramLeadConnection(params: {
  enabled: boolean;
  botToken: string;
  registerWebhook: boolean;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  await ensureLeadConnections(user.organizationId);

  const existing = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: "TELEGRAM",
      },
    },
  });

  const current = asConfigRecord(existing?.config);
  const botToken =
    params.botToken.trim() || readString(current, "botToken");
  if (!botToken) {
    return { ok: false, message: "Bot token is required." };
  }

  const verified = await verifyTelegramBotToken(botToken);
  if (!verified.ok) {
    return { ok: false, message: `Bot check failed: ${verified.message}` };
  }

  const webhook = ensureTelegramWebhookSecret(existing?.config);
  const webhookUrl = telegramLeadWebhookUrl(webhook.secret);

  if (params.enabled && params.registerWebhook) {
    const set = await setTelegramWebhook({
      botToken,
      webhookUrl,
      secretToken: webhook.secret,
    });
    if (!set.ok) {
      return { ok: false, message: `setWebhook failed: ${set.message}` };
    }
  }

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: "TELEGRAM",
      },
    },
    data: {
      enabled: params.enabled,
      ingestSecretHash: webhook.hash,
      config: {
        botToken,
        webhookSecret: webhook.secret,
        botUsername: verified.botUsername,
        botName: verified.botName,
      } as Prisma.InputJsonValue,
      lastSyncError: null,
      syncStatus: "IDLE",
      label: "Telegram Bot intake",
    },
  });

  revalidatePath("/app/leads/settings");
  revalidatePath("/app/leads");
  return {
    ok: true,
    message: params.enabled
      ? `Telegram connected${verified.botUsername ? ` (@${verified.botUsername})` : ""}.`
      : "Telegram settings saved (intake disabled).",
    webhookUrl,
  };
}

export async function importLeadsFromCsvAction(formData: FormData) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "Not allowed." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, message: "Choose a CSV file to import." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false as const, message: "Upload a .csv file." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false as const, message: "CSV must be under 5 MB." };
  }

  const content = await file.text();
  const { parseLeadsCsv } = await import("@/lib/leads/csv-import");
  const { rows, errors } = parseLeadsCsv(content);
  if (!rows.length) {
    return {
      ok: false as const,
      message: errors[0] ?? "No valid lead rows found in the CSV.",
      errors,
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const rowErrors = [...errors];

  for (const row of rows.slice(0, 500)) {
    try {
      const result = await ingestInboundLead({
        organizationId: user.organizationId,
        channel: row.channel,
        externalId: row.externalId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        city: row.city,
        requirement: row.requirement,
        status: row.status ?? undefined,
        campaign: row.campaign,
        utmSource: row.utmSource,
        utmMedium: row.utmMedium,
        utmCampaign: row.utmCampaign,
        landingPage: row.landingPage,
        pipeValue: row.pipeValue,
        expectedCloseAt: row.expectedCloseAt,
        winProbability: row.winProbability,
        capturedAt: new Date(),
        actorUserId: user.id,
        createdByUserId: user.id,
        createFmsJob: false,
        hardBlockDuplicates: false,
      });
      if (!result.lead) {
        skipped += 1;
        continue;
      }
      if (result.created) {
        created += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      skipped += 1;
      rowErrors.push(
        `Row ${row.rowNumber}: ${error instanceof Error ? error.message : "import failed"}`,
      );
    }
  }

  revalidatePath("/app/leads");
  return {
    ok: true as const,
    message: `Imported ${created} new, updated ${updated}, skipped ${skipped}.`,
    created,
    updated,
    skipped,
    errors: rowErrors.slice(0, 20),
  };
}

export async function getLeadTrainingSlotsAction(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!lead) {
    return { ok: false as const, message: "Lead not found.", enrollments: [] };
  }

  const { listLeadTrainingEnrollments, buildTrainingGoogleCalendarUrl, formatSlotWhen } =
    await import("@/lib/courses/slots");
  const { courseCohortLabel } = await import("@/lib/content/courses-enrollment");
  const enrollments = await listLeadTrainingEnrollments({
    organizationId: user.organizationId,
    leadId: lead.id,
    email: lead.email,
    phone: lead.phone,
  });

  return {
    ok: true as const,
    message: "",
    enrollments: enrollments.map((enrollment) => ({
      id: enrollment.id,
      name: enrollment.name,
      email: enrollment.email,
      phone: enrollment.phone,
      cohort: enrollment.cohort,
      weekdaysCsv: enrollment.weekdaysCsv,
      daysLabel: courseCohortLabel(enrollment.cohort, enrollment.weekdaysCsv),
      status: enrollment.status,
      bookingToken: enrollment.bookingToken,
      programStartDate: enrollment.programStartDate?.toISOString() ?? null,
      meetUrl: enrollment.meetUrl,
      slots: enrollment.slots.map((slot) => ({
        id: slot.id,
        sessionNumber: slot.sessionNumber,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        title: slot.title,
        status: slot.status,
        meetUrl: slot.meetUrl,
        whenLabel: formatSlotWhen(slot.startsAt),
        googleCalendarUrl: buildTrainingGoogleCalendarUrl({
          title: slot.title,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          meetUrl: slot.meetUrl ?? enrollment.meetUrl,
          studentName: enrollment.name,
        }),
      })),
    })),
  };
}

export async function bookLeadTrainingSlotsAction(formData: FormData) {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "STAFF")) {
    return { ok: false as const, message: "Staff access required." };
  }

  const leadId = String(formData.get("leadId") ?? "").trim();
  const programStartYmd = String(formData.get("programStartYmd") ?? "").trim();
  const meetUrl = String(formData.get("meetUrl") ?? "").trim() || null;
  const frequency = String(formData.get("frequency") ?? "WEEKLY").trim();
  const sessionTimeIst = String(formData.get("sessionTimeIst") ?? "08:30").trim();
  const totalSessionsRaw = String(formData.get("totalSessions") ?? "24").trim();
  const sessionDurationRaw = String(formData.get("sessionDurationMin") ?? "90").trim();
  const dayOne = formData.get("dayOne");
  const dayTwo = formData.get("dayTwo");
  if (!leadId || !programStartYmd) {
    return { ok: false as const, message: "Lead and start date are required." };
  }

  const { normalizeTrainingWeekdays, weekdaysLabel } = await import(
    "@/lib/courses/weekdays"
  );
  const pair = normalizeTrainingWeekdays(dayOne, dayTwo);
  if (!pair.ok) {
    return { ok: false as const, message: pair.message };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!lead) {
    return { ok: false as const, message: "Lead not found." };
  }
  if (!lead.email || !lead.phone) {
    return {
      ok: false as const,
      message: "Add client email and phone in Details before booking training slots.",
    };
  }

  const { bookTrainingSlotsForLead } = await import("@/lib/courses/slots");
  const result = await bookTrainingSlotsForLead({
    organizationId: user.organizationId,
    leadId: lead.id,
    weekdays: pair.days,
    programStartYmd,
    meetUrl,
    frequency,
    sessionTimeIst,
    totalSessions: Number.parseInt(totalSessionsRaw, 10),
    sessionDurationMin: Number.parseInt(sessionDurationRaw, 10),
    name: lead.name?.trim() || "Client",
    phone: lead.phone,
    email: lead.email,
    markConfirmed: true,
    confirmedById: user.id,
  });

  if (result.ok) {
    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId: lead.id,
      type: "NOTE",
      body: `Training course slots booked (${weekdaysLabel(pair.days)}, ${frequency}, ${sessionTimeIst} IST, ${totalSessionsRaw} sessions) starting ${programStartYmd}. Email + WhatsApp alerts sent.`,
      createdByUserId: user.id,
    });
  }

  revalidatePath("/app/leads");
  revalidatePath("/app/my-space/training");
  return { ok: result.ok, message: result.message };
}
