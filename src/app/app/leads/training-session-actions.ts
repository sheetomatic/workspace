"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import {
  findTrainingSlotForStaff,
  normalizeTrainingContentUrl,
  TRAINING_MATERIAL_MAX_BYTES,
} from "@/lib/courses/session-materials";

function refreshTrainingPaths() {
  revalidatePath("/app/leads");
  revalidatePath("/app/leads/training");
  revalidatePath("/app/my-space/training");
  revalidatePath("/app/my-space/training/content");
}

export async function saveTrainingSessionRecordingAction(formData: FormData) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF") && !user.isSuperAdmin) {
    return { ok: false as const, message: "Staff access required." };
  }

  const slotId = String(formData.get("slotId") ?? "").trim();
  const title =
    String(formData.get("title") ?? "").trim() || "Session recording";
  const url = normalizeTrainingContentUrl(String(formData.get("url") ?? ""));
  const markComplete = String(formData.get("markComplete") ?? "") === "1";

  if (!slotId || !url) {
    return {
      ok: false as const,
      message: "Paste a https recording link (Drive, YouTube, or Meet).",
    };
  }

  const slot = await findTrainingSlotForStaff(
    slotId,
    user.organizationId,
    user.isSuperAdmin,
  );
  if (!slot) {
    return { ok: false as const, message: "Session not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.trainingSessionMaterial.create({
      data: {
        slotId: slot.id,
        kind: "RECORDING",
        title,
        url,
        createdById: user.id,
      },
    });
    if (markComplete && slot.status !== "COMPLETED") {
      await tx.trainingCourseSlot.update({
        where: { id: slot.id },
        data: { status: "COMPLETED" },
      });
    }
  });

  if (slot.inboundLeadId) {
    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId: slot.inboundLeadId,
      type: "NOTE",
      body: markComplete
        ? `Training session ${slot.sessionNumber} marked done. Recording added.`
        : `Recording added to training session ${slot.sessionNumber}.`,
      createdByUserId: user.id,
    });
  }

  refreshTrainingPaths();
  return {
    ok: true as const,
    message: markComplete
      ? `Session ${slot.sessionNumber} done. Recording saved.`
      : `Recording saved on session ${slot.sessionNumber}.`,
  };
}

export async function addTrainingSessionDocumentAction(formData: FormData) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF") && !user.isSuperAdmin) {
    return { ok: false as const, message: "Staff access required." };
  }

  const slotId = String(formData.get("slotId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const url = normalizeTrainingContentUrl(String(formData.get("url") ?? ""));
  const file = formData.get("file");

  if (!slotId) {
    return { ok: false as const, message: "Session is required." };
  }

  const slot = await findTrainingSlotForStaff(
    slotId,
    user.organizationId,
    user.isSuperAdmin,
  );
  if (!slot) {
    return { ok: false as const, message: "Session not found." };
  }

  const uploaded = file instanceof File && file.size > 0 ? file : null;
  if (!url && !uploaded) {
    return {
      ok: false as const,
      message: "Add a document link or upload a file (max 12 MB).",
    };
  }
  if (uploaded && uploaded.size > TRAINING_MATERIAL_MAX_BYTES) {
    return { ok: false as const, message: `${uploaded.name} is too large (max 12 MB).` };
  }

  await prisma.trainingSessionMaterial.create({
    data: {
      slotId: slot.id,
      kind: "DOCUMENT",
      title: title || uploaded?.name || "Session document",
      url,
      fileName: uploaded?.name ?? null,
      mimeType: uploaded?.type || null,
      fileSize: uploaded?.size ?? null,
      data: uploaded ? Buffer.from(await uploaded.arrayBuffer()) : undefined,
      createdById: user.id,
    },
  });

  if (slot.inboundLeadId) {
    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId: slot.inboundLeadId,
      type: "NOTE",
      body: `Document added to training session ${slot.sessionNumber}.`,
      createdByUserId: user.id,
    });
  }

  refreshTrainingPaths();
  return {
    ok: true as const,
    message: `Document saved on session ${slot.sessionNumber}.`,
  };
}

export async function removeTrainingSessionMaterialAction(materialId: string) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF") && !user.isSuperAdmin) {
    return { ok: false as const, message: "Staff access required." };
  }

  const material = await prisma.trainingSessionMaterial.findFirst({
    where: { id: materialId },
    select: { id: true, slotId: true },
  });
  if (!material) {
    return { ok: false as const, message: "File not found." };
  }

  const slot = await findTrainingSlotForStaff(
    material.slotId,
    user.organizationId,
    user.isSuperAdmin,
  );
  if (!slot) {
    return { ok: false as const, message: "File not found." };
  }

  await prisma.trainingSessionMaterial.delete({ where: { id: material.id } });
  refreshTrainingPaths();
  return { ok: true as const, message: "Removed." };
}
