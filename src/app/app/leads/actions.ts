"use server";

import { revalidatePath } from "next/cache";
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
import { computeLeadScore, recomputeAndSaveScore } from "@/lib/leads/scoring";
import { sendPlainEmail } from "@/lib/integrations/email";
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

async function exportLeadToGoogleSheetAfterSave(
  organizationId: string,
  leadId: string,
) {
  await pushLeadToGoogleSheet(organizationId, leadId);
}

export async function assignInboundLead(leadId: string, assigneeUserId: string | null) {
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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

  await logInboundLeadActivity({
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

  await exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true, score, temperature };
}

export async function updateInboundLeadCategory(leadId: string, category: string) {
  const user = await requireSession(undefined, { module: "FMS" });
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

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "EDIT",
    body: `Category set to ${category.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  await exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

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
  discussionNotes: string;
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
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const existing = await prisma.inboundLead.findFirst({
    where: { id: params.leadId, organizationId: user.organizationId },
    select: {
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
      discussionNotes: params.discussionNotes.trim() || null,
      category,
      quotationValue: Number.isFinite(quotation) && quotation > 0 ? quotation : null,
      pipeValue,
      score,
      temperature,
      ...utmPatch,
      modifiedAt: new Date(),
    },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: params.leadId,
    type: "EDIT",
    body: "Lead details updated",
    createdByUserId: user.id,
  });

  await exportLeadToGoogleSheetAfterSave(user.organizationId, params.leadId);

  revalidatePath("/app/leads");
  return { ok: true, score, temperature };
}

export async function deleteInboundLead(leadId: string) {
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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

  await exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function logLeadContactAction(leadId: string, type: "CALL" | "WHATSAPP") {
  const user = await requireSession(undefined, { module: "FMS" });
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
]);

export async function sendLeadNurtureWhatsAppAction(
  leadId: string,
  stepId: LeadNurtureEventId,
) {
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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

  await exportLeadToGoogleSheetAfterSave(user.organizationId, params.leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function completeInboundLeadFollowUp(followUpId: string) {
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
): Promise<LeadSyncActionResult> {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(channel)) {
    return { ok: false, message: "This connector is coming soon." };
  }

  const result =
    channel === "GOOGLE_SHEETS"
      ? await syncLeadsTwoWay(user.organizationId)
      : await pullLeadsFromConnection({
          organizationId: user.organizationId,
          channel,
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(params.channel)) {
    return { ok: false, message: "This connector is coming soon." };
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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

export async function applyAiSuggestedLeadStatus(leadId: string) {
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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

  await exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function updateLeadCallingStatus(
  leadId: string,
  callingStatus: LeadCallingStatus,
  callNotes?: string,
) {
  const user = await requireSession(undefined, { module: "FMS" });
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

  await exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

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
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: {
      projectStatus,
      ...(projectStatus === "IN_PROGRESS" ? { status: "PROJECT_ACTIVE" as const } : {}),
    },
  });

  await exportLeadToGoogleSheetAfterSave(user.organizationId, leadId);

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
  const user = await requireSession(undefined, { module: "FMS" });
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

export async function addLeadOfferedService(params: {
  leadId: string;
  catalogId: string;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession("MANAGER", { module: "FMS" });

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
  const user = await requireSession(undefined, { module: "FMS" });
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

  const businessRaw = formData.get("businessPhone")?.toString() ?? "";
  const businessDigits = leadPhoneDigits(businessRaw);
  if (businessRaw.trim() && !businessDigits) {
    return {
      ok: false,
      message: "Business WhatsApp number must be at least 10 digits.",
    };
  }

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

  await prisma.workspaceWhatsAppSettings.upsert({
    where: { organizationId: user.organizationId },
    create: {
      organizationId: user.organizationId,
      businessPhone: businessDigits || null,
      whatsappProvider: "MESSAGEAUTOSENDER",
      masUsername,
      masPassword,
      masApiKey,
    },
    update: {
      businessPhone: businessDigits || existing?.businessPhone || null,
      whatsappProvider: "MESSAGEAUTOSENDER",
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
    message: "Web Based API credentials saved.",
  };
}

export async function saveLeadsNurtureSettings(
  _prev: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requireSession(undefined, { module: "FMS" });
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

  const config: LeadNurtureOrgConfig = parseLeadNurtureConfig({
    enabled,
    stageMinGapHours,
    templates,
  });

  await saveLeadNurtureConfig(user.organizationId, config);

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  return {
    ok: true,
    message: enabled
      ? "Nurture messages saved. WhatsApp will send on lead events."
      : "Nurture messages saved. Automatic sending is paused.",
  };
}

export async function setWhatsAppLeadIngestEnabled(enabled: boolean) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  await ensureLeadConnections(user.organizationId);

  if (enabled) {
    const creds = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
    const phoneId = creds.redlavaPhoneId?.trim();
    const hasOfficial =
      Boolean(phoneId) &&
      Boolean(creds.metaAccessToken?.trim() || creds.redlavaApiKey?.trim());
    if (!hasOfficial) {
      return {
        ok: false,
        message:
          "Configure Official API (access token + phone number ID) in WhatsApp settings first.",
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
  const user = await requireSession(undefined, { module: "FMS" });
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
