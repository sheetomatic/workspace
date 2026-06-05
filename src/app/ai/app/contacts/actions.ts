"use server";

import type { WaPipelineStage } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";
import { syncContactNextFollowUp } from "@/lib/wa-crm";
import { waInboxListTag } from "@/lib/wa-inbox-store";

export type WaCrmActionResult = { ok: boolean; message: string };

async function requireCrmAdmin() {
  return requireSession("ADMIN", { redirectTo: "/ai/app" });
}

function revalidateCrm(organizationId: string) {
  revalidatePath("/ai/app/contacts");
  revalidateTag(waInboxListTag(organizationId), { expire: 0 });
}

export async function assignWaLead(
  contactId: string,
  assigneeUserId: string | null,
): Promise<WaCrmActionResult> {
  const user = await requireCrmAdmin();

  const updated = await prisma.waContact.updateMany({
    where: { id: contactId, organizationId: user.organizationId },
    data: { assignedToId: assigneeUserId || null },
  });

  if (updated.count === 0) {
    return { ok: false, message: "Lead not found." };
  }

  revalidateCrm(user.organizationId);
  return { ok: true, message: assigneeUserId ? "Lead assigned." : "Lead unassigned." };
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

  const assigneeUserId =
    params.assigneeUserId?.trim() ||
    contact.assignedToId ||
    user.id;

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
  return { ok: true, message: "Follow-up marked done." };
}
