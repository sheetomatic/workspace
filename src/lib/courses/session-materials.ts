import type { TrainingMaterialKind } from "@prisma/client";
import { prisma } from "@/lib/db";

export const TRAINING_MATERIAL_MAX_BYTES = 12 * 1024 * 1024;

export const TRAINING_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.zip";

export type TrainingMaterialView = {
  id: string;
  kind: TrainingMaterialKind;
  title: string;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  href: string;
};

const MATERIAL_SELECT = {
  id: true,
  kind: true,
  title: true,
  url: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
} as const;

export function normalizeTrainingContentUrl(
  raw: string | null | undefined,
): string | null {
  let value = String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!value) return null;

  const extracted = value.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (extracted) {
    value = extracted;
  } else if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(value)) {
    value = `https://${value}`;
  }

  value = value.replace(/[.,);]+$/g, "").slice(0, 800);
  if (!/^https:\/\//i.test(value)) {
    return null;
  }
  return value;
}

export function materialHref(material: {
  id: string;
  url: string | null;
}): string {
  return material.url?.trim() || `/api/learn/materials/${material.id}`;
}

export function toTrainingMaterialView(material: {
  id: string;
  kind: TrainingMaterialKind;
  title: string;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
}): TrainingMaterialView {
  return {
    ...material,
    href: materialHref(material),
  };
}

export async function findTrainingSlotForOrg(
  slotId: string,
  organizationId: string,
) {
  const slot = await prisma.trainingCourseSlot.findFirst({
    where: { id: slotId },
    include: {
      enrollment: {
        select: {
          id: true,
          organizationId: true,
          inboundLeadId: true,
          name: true,
        },
      },
    },
  });
  if (!slot) return null;

  let inOrg = slot.organizationId === organizationId;
  if (!inOrg && slot.enrollment.organizationId === organizationId) {
    inOrg = true;
  }
  if (!inOrg && slot.inboundLeadId) {
    const lead = await prisma.inboundLead.findFirst({
      where: { id: slot.inboundLeadId, organizationId },
      select: { id: true },
    });
    inOrg = Boolean(lead);
  }
  return inOrg ? slot : null;
}

export async function findTrainingSlotForStaff(
  slotId: string,
  organizationId: string,
  isSuperAdmin?: boolean,
) {
  if (isSuperAdmin) {
    const slot = await prisma.trainingCourseSlot.findFirst({
      where: { id: slotId },
      include: {
        enrollment: {
          select: {
            id: true,
            organizationId: true,
            inboundLeadId: true,
            name: true,
          },
        },
      },
    });
    return slot;
  }
  return findTrainingSlotForOrg(slotId, organizationId);
}

export { MATERIAL_SELECT };
