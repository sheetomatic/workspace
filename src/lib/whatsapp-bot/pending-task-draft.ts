import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";

export type PendingTaskDraft = {
  instruction: string;
  draft: ParsedTaskDraft;
  missing: string[];
  askedAt: string;
};

function draftExternalId(organizationId: string, phone: string) {
  return `pending-task-draft:${organizationId}:${phone}`;
}

export async function loadPendingTaskDraft(
  organizationId: string,
  fromPhone: string,
): Promise<PendingTaskDraft | null> {
  const phone = normalizeWhatsAppPhone(fromPhone);
  if (!phone) {
    return null;
  }
  const row = await prisma.whatsAppInboundEvent.findUnique({
    where: { externalId: draftExternalId(organizationId, phone) },
    select: { status: true, error: true },
  });
  if (row?.status !== "pending_assignment" || !row.error) {
    return null;
  }
  try {
    const parsed = JSON.parse(row.error) as PendingTaskDraft;
    if (!parsed?.instruction || !parsed.draft) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function savePendingTaskDraft(params: {
  organizationId: string;
  fromPhone: string;
  pending: PendingTaskDraft;
}) {
  const phone = normalizeWhatsAppPhone(params.fromPhone);
  if (!phone) {
    return;
  }
  const externalId = draftExternalId(params.organizationId, phone);
  await prisma.whatsAppInboundEvent.upsert({
    where: { externalId },
    create: {
      externalId,
      organizationId: params.organizationId,
      fromPhone: phone,
      messageType: "task_draft",
      status: "pending_assignment",
      error: JSON.stringify(params.pending),
    },
    update: {
      status: "pending_assignment",
      error: JSON.stringify(params.pending),
      processedAt: new Date(),
    },
  });
}

export async function clearPendingTaskDraft(
  organizationId: string,
  fromPhone: string,
) {
  const phone = normalizeWhatsAppPhone(fromPhone);
  if (!phone) {
    return;
  }
  await prisma.whatsAppInboundEvent.deleteMany({
    where: { externalId: draftExternalId(organizationId, phone) },
  });
}
