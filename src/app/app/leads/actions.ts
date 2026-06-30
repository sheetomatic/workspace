"use server";

import { revalidatePath } from "next/cache";
import type {
  InboundLeadStatus,
  LeadPaymentMethod,
  LeadPaymentType,
  LeadProjectStatus,
  LeadCallingStatus,
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
} from "@/lib/leads/categories";
import { bridgeInboundLeadToFms } from "@/lib/leads/fms-bridge";
import { testLeadsGoogleSheetAccess } from "@/lib/leads/google-sheets";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { buildGoogleSheetsLeadConfigFromInput } from "@/lib/leads/sheet-config";
import {
  formatLeadSyncCounts,
  formatLeadSyncError,
} from "@/lib/leads/sync-messages";
import { pullLeadsFromConnection } from "@/lib/leads/sync-sources";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { computeQuotationTotals, nextQuotationNumber } from "@/lib/leads/quotations";
import { inferLeadStageFromRequirement } from "@/lib/leads/stage-ai";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

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
    data: { assignedToId: assigneeUserId || null },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function updateInboundLeadStatus(leadId: string, status: InboundLeadStatus) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { status },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId,
    type: "STATUS_CHANGE",
    body: `Status changed to ${status.replaceAll("_", " ")}`,
    createdByUserId: user.id,
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function updateInboundLeadDetails(params: {
  leadId: string;
  name: string;
  phone: string;
  email: string;
  requirement: string;
  discussionNotes: string;
  quotationValue: string;
  pipeValue: string;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const category = categorizeLeadRequirement(params.requirement);
  const quotation = Number.parseFloat(params.quotationValue);
  const pipe = Number.parseFloat(params.pipeValue);

  await prisma.inboundLead.updateMany({
    where: { id: params.leadId, organizationId: user.organizationId },
    data: {
      name: params.name.trim() || null,
      phone: params.phone.trim() || null,
      email: params.email.trim() || null,
      requirement: params.requirement.trim() || null,
      discussionNotes: params.discussionNotes.trim() || null,
      category,
      quotationValue: Number.isFinite(quotation) && quotation > 0 ? quotation : null,
      pipeValue:
        Number.isFinite(pipe) && pipe > 0
          ? pipe
          : defaultPipeValueForCategory(category),
    },
  });

  await logInboundLeadActivity({
    organizationId: user.organizationId,
    leadId: params.leadId,
    type: "EDIT",
    body: "Lead details updated",
    createdByUserId: user.id,
  });

  revalidatePath("/app/leads");
  return { ok: true };
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

export async function syncLeadChannelNow(channel: LeadSourceChannel) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(channel)) {
    return { ok: false, message: "This connector is coming soon." };
  }

  const result = await pullLeadsFromConnection({
    organizationId: user.organizationId,
    channel,
  });

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  if (!result.ok) {
    return { ok: false, message: formatLeadSyncError(result.reason) };
  }

  return {
    ok: true,
    imported: result.imported,
    counts: result.counts,
    message: formatLeadSyncCounts(
      result.counts ?? {
        processed: result.imported,
        created: result.imported,
        updated: 0,
      },
    ),
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
    message: `Live and connected. ${formatLeadSyncCounts(
      sync.counts ?? {
        processed: sync.imported,
        created: sync.imported,
        updated: 0,
      },
    )}`,
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
  const requirement = formData.get("requirement")?.toString().trim() || "";

  if (!name && !phone) {
    return { ok: false, message: "Name or phone required." };
  }

  await ingestInboundLead({
    organizationId: user.organizationId,
    channel: "MANUAL",
    externalId: `manual-${Date.now()}`,
    name,
    phone,
    requirement,
    capturedAt: new Date(),
    actorUserId: user.id,
    createFmsJob: true,
  });

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
  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: {
      meetingNotes: trimmed || null,
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
  }

  revalidatePath("/app/leads");
  return { ok: true };
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
  return { ok: true };
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

export async function createLeadQuotation(params: {
  leadId: string;
  requestType: QuotationRequestType;
  durationDays?: string;
  notes?: string;
  lineCatalogIds: string[];
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
    params.lineCatalogIds.length > 0
      ? params.lineCatalogIds
      : (lead.offeredServices.map((item) => item.catalogId).filter(Boolean) as string[]);

  const catalog = await prisma.leadServiceCatalog.findMany({
    where: { organizationId: user.organizationId, id: { in: catalogIds } },
  });
  if (catalog.length === 0) {
    return { ok: false, message: "Add at least one offered service first." };
  }

  const lines = catalog.map((item) => {
    const price = item.unitPrice ? Number(item.unitPrice) : 0;
    return {
      serviceCategory: item.serviceCategory,
      subCategory: item.subCategory,
      quantity: 1,
      unitPrice: price,
      lineTotal: price,
    };
  });

  const totals = computeQuotationTotals(lines);
  const quotationNumber = await nextQuotationNumber(user.organizationId);
  const durationDays = Number.parseInt(params.durationDays ?? "", 10);
  const quotationDate = new Date();
  const projectStartDate = quotationDate;
  const endDate = Number.isFinite(durationDays)
    ? new Date(projectStartDate.getTime() + durationDays * 86400000)
    : null;

  const quotation = await prisma.inboundLeadQuotation.create({
    data: {
      organizationId: user.organizationId,
      leadId: lead.id,
      quotationNumber,
      requestType: params.requestType,
      company: lead.company,
      address: lead.address,
      zipCode: lead.zipCode,
      quotationDate,
      projectStartDate,
      durationDays: Number.isFinite(durationDays) ? durationDays : null,
      endDate,
      subtotal: totals.subtotal,
      totalAmount: totals.totalAmount,
      notes: params.notes?.trim() || null,
      createdByUserId: user.id,
      lines: { create: lines },
    },
  });

  await prisma.inboundLead.updateMany({
    where: { id: lead.id, organizationId: user.organizationId },
    data: {
      status: "PROPOSAL_INVOICE",
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

  await prisma.inboundLeadQuotation.updateMany({
    where: { id: quotationId, organizationId: user.organizationId },
    data: { sentAt: new Date() },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}
