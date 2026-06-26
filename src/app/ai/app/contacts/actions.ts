"use server";

import type { WaPipelineStage } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";
import {
  exportWaCrmToGoogleSheet,
  triggerWaCrmSheetSync,
} from "@/lib/integrations/google-sheets-wa-crm";
import { syncContactNextFollowUp } from "@/lib/wa-crm";
import { notifyWaLeadAssignment } from "@/lib/wa-crm-notifications";
import { waInboxListTag } from "@/lib/wa-inbox-store";

export type WaCrmActionResult = { ok: boolean; message: string };

async function requireCrmAdmin() {
  return requireSession("ADMIN", { redirectTo: "/ai/app" });
}

/** Ensure a client-supplied assignee actually belongs to the caller's org. */
async function assigneeBelongsToOrg(
  assigneeUserId: string,
  organizationId: string,
) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId: assigneeUserId, organizationId },
    },
    select: { id: true },
  });
  return Boolean(membership);
}

const ASSIGNEE_NOT_IN_ORG = "Selected assignee is not a member of this workspace.";

function revalidateCrm(organizationId: string) {
  revalidatePath("/ai/app/contacts");
  revalidateTag(waInboxListTag(organizationId), { expire: 0 });
}

function scheduleCrmSheetSync(organizationId: string) {
  triggerWaCrmSheetSync(organizationId);
}

function assignmentMessage(base: string, waSent: boolean, waDetail?: string) {
  if (waSent) {
    return `${base} WhatsApp notification sent.`;
  }
  if (waDetail === "assignee_has_no_phone") {
    return `${base} Add assignee phone in Team to enable WhatsApp alerts.`;
  }
  if (waDetail) {
    return `${base} WhatsApp not sent (${waDetail}).`;
  }
  return base;
}

export async function assignWaLead(
  contactId: string,
  assigneeUserId: string | null,
): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();

  const contact = await prisma.waContact.findFirst({
    where: { id: contactId, organizationId: user.organizationId },
    select: { id: true, name: true, phone: true },
  });

  if (!contact) {
    return { ok: false, message: "Lead not found." };
  }

  if (
    assigneeUserId &&
    !(await assigneeBelongsToOrg(assigneeUserId, user.organizationId))
  ) {
    return { ok: false, message: ASSIGNEE_NOT_IN_ORG };
  }

  await prisma.waContact.update({
    where: { id: contact.id },
    data: { assignedToId: assigneeUserId || null },
  });

  let waDetail: string | undefined;
  let waSent = false;
  if (assigneeUserId) {
    const notify = await notifyWaLeadAssignment({
      organizationId: user.organizationId,
      assigneeUserId,
      leads: [{ name: contact.name, phone: contact.phone }],
    });
    waSent = notify.sent;
    if (!notify.sent && "detail" in notify) {
      waDetail = notify.detail;
    }
  }

  revalidateCrm(user.organizationId);
  scheduleCrmSheetSync(user.organizationId);
  return {
    ok: true,
    message: assigneeUserId
      ? assignmentMessage("Lead assigned.", waSent, waDetail)
      : "Lead unassigned.",
  };
}

export async function bulkAssignWaLeads(
  contactIds: string[],
  assigneeUserId: string,
): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();
  const uniqueIds = [...new Set(contactIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { ok: false, message: "Select at least one lead." };
  }
  if (!assigneeUserId.trim()) {
    return { ok: false, message: "Choose an assignee." };
  }

  if (!(await assigneeBelongsToOrg(assigneeUserId.trim(), user.organizationId))) {
    return { ok: false, message: ASSIGNEE_NOT_IN_ORG };
  }

  const contacts = await prisma.waContact.findMany({
    where: {
      organizationId: user.organizationId,
      id: { in: uniqueIds },
    },
    select: { id: true, name: true, phone: true },
  });

  if (contacts.length === 0) {
    return { ok: false, message: "No matching leads found." };
  }

  await prisma.waContact.updateMany({
    where: {
      organizationId: user.organizationId,
      id: { in: contacts.map((contact) => contact.id) },
    },
    data: { assignedToId: assigneeUserId },
  });

  const notify = await notifyWaLeadAssignment({
    organizationId: user.organizationId,
    assigneeUserId,
    leads: contacts,
  });

  revalidateCrm(user.organizationId);
  scheduleCrmSheetSync(user.organizationId);

  const base = `Assigned ${contacts.length} lead${contacts.length === 1 ? "" : "s"}.`;
  if (notify.sent) {
    return { ok: true, message: `${base} WhatsApp notification sent.` };
  }
  const detail = !notify.sent && "detail" in notify ? notify.detail : undefined;
  return {
    ok: true,
    message: assignmentMessage(base, false, detail),
  };
}

export async function updateWaLeadStage(
  contactId: string,
  pipelineStage: WaPipelineStage,
): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();

  const updated = await prisma.waContact.updateMany({
    where: { id: contactId, organizationId: user.organizationId },
    data: { pipelineStage },
  });

  if (updated.count === 0) {
    return { ok: false, message: "Lead not found." };
  }

  revalidateCrm(user.organizationId);
  scheduleCrmSheetSync(user.organizationId);
  return { ok: true, message: "Stage updated." };
}

export async function updateWaLeadNotes(
  contactId: string,
  notes: string,
): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();

  const updated = await prisma.waContact.updateMany({
    where: { id: contactId, organizationId: user.organizationId },
    data: { notes: notes.trim() || null },
  });

  if (updated.count === 0) {
    return { ok: false, message: "Lead not found." };
  }

  revalidateCrm(user.organizationId);
  scheduleCrmSheetSync(user.organizationId);
  return { ok: true, message: "Notes saved." };
}

export async function scheduleWaFollowUp(params: {
  contactId: string;
  scheduledAt: string;
  notes?: string;
  reminderNote?: string;
  assigneeUserId?: string | null;
}): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();
  const scheduled = new Date(params.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    return { ok: false, message: "Invalid follow-up date." };
  }

  const contact = await prisma.waContact.findFirst({
    where: { id: params.contactId, organizationId: user.organizationId },
    select: { id: true, assignedToId: true },
  });

  if (!contact) {
    return { ok: false, message: "Lead not found." };
  }

  const requestedAssignee = params.assigneeUserId?.trim();
  if (
    requestedAssignee &&
    !(await assigneeBelongsToOrg(requestedAssignee, user.organizationId))
  ) {
    return { ok: false, message: ASSIGNEE_NOT_IN_ORG };
  }

  const assigneeUserId = requestedAssignee || contact.assignedToId || user.id;

  await prisma.waContactFollowUp.create({
    data: {
      organizationId: user.organizationId,
      contactId: contact.id,
      assigneeUserId,
      scheduledAt: scheduled,
      notes: params.notes?.trim() || null,
      reminderNote: params.reminderNote?.trim() || null,
      createdByUserId: user.id,
    },
  });

  await syncContactNextFollowUp(user.organizationId, contact.id);
  revalidateCrm(user.organizationId);
  scheduleCrmSheetSync(user.organizationId);
  return { ok: true, message: "Follow-up scheduled." };
}

export async function completeWaFollowUp(
  followUpId: string,
): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();

  const followUp = await prisma.waContactFollowUp.findFirst({
    where: { id: followUpId, organizationId: user.organizationId },
    select: { id: true, contactId: true },
  });

  if (!followUp) {
    return { ok: false, message: "Follow-up not found." };
  }

  await prisma.waContactFollowUp.update({
    where: { id: followUp.id },
    data: { completedAt: new Date() },
  });

  await syncContactNextFollowUp(user.organizationId, followUp.contactId);
  revalidateCrm(user.organizationId);
  scheduleCrmSheetSync(user.organizationId);
  return { ok: true, message: "Follow-up marked done." };
}

export async function exportWaCrmToGoogleSheetAction(): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();
  const result = await exportWaCrmToGoogleSheet(user.organizationId);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    message: `${result.message} Open: ${result.spreadsheetUrl}`,
  };
}
