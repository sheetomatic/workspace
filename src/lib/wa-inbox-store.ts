import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { WaLeadCaptureStep } from "@prisma/client";
import { triggerWaCrmSheetSync } from "@/lib/integrations/google-sheets-wa-crm";
import { queueLeadSyncFromWhatsApp } from "@/lib/leads/ingest";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";
import { SCALE } from "@/lib/scale";

export function waInboxListTag(organizationId: string) {
  return `wa-inbox-list-${organizationId}`;
}

function bustInboxListCache(organizationId: string) {
  revalidateTag(waInboxListTag(organizationId), { expire: 0 });
}

function displayNameFromPhone(phone: string) {
  const formatted = formatWhatsAppPhone(phone);
  return formatted === "-" ? phone : formatted;
}

async function ensureOpenConversation(
  organizationId: string,
  contactId: string,
  preview: string,
) {
  const existing = await prisma.waConversation.findFirst({
    where: {
      organizationId,
      contactId,
      status: "OPEN",
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (existing) {
    return prisma.waConversation.update({
      where: { id: existing.id },
      data: {
        preview: preview.slice(0, 200),
        lastMessageAt: new Date(),
      },
    });
  }

  return prisma.waConversation.create({
    data: {
      organizationId,
      contactId,
      preview: preview.slice(0, 200),
      lastMessageAt: new Date(),
    },
  });
}

export async function recordWaInboundMessage(params: {
  organizationId: string;
  fromPhone: string;
  externalId: string;
  body: string;
  messageType: string;
  contactName?: string | null;
  intent?: string | null;
}) {
  const phone = normalizeWhatsAppPhone(params.fromPhone);
  if (!phone || !params.body.trim()) {
    return null;
  }

  const existingMessage = await prisma.waMessage.findUnique({
    where: { externalId: params.externalId },
  });
  if (existingMessage) {
    return null;
  }

  const contact = await prisma.waContact.upsert({
    where: {
      organizationId_phone: { organizationId: params.organizationId, phone },
    },
    create: {
      organizationId: params.organizationId,
      phone,
      name: params.contactName?.trim() || displayNameFromPhone(phone),
      intent: params.intent ?? "General",
      source: "whatsapp",
      lastMessageAt: new Date(),
      unreadCount: 1,
    },
    update: {
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
      ...(params.intent ? { intent: params.intent } : {}),
    },
  });

  const conversation = await ensureOpenConversation(
    params.organizationId,
    contact.id,
    params.body,
  );

  await prisma.waMessage.create({
    data: {
      organizationId: params.organizationId,
      conversationId: conversation.id,
      externalId: params.externalId,
      direction: "INBOUND",
      body: params.body.trim(),
      messageType: params.messageType,
    },
  });

  bustInboxListCache(params.organizationId);
  queueLeadSyncFromWhatsApp({
    organizationId: params.organizationId,
    contactId: contact.id,
  });
  return { contactId: contact.id, conversationId: conversation.id };
}

export async function getWaContactByPhone(
  organizationId: string,
  fromPhone: string,
) {
  const phone = normalizeWhatsAppPhone(fromPhone);
  if (!phone) {
    return null;
  }

  return prisma.waContact.findUnique({
    where: {
      organizationId_phone: { organizationId, phone },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      city: true,
      requirementDescription: true,
      leadCaptureStep: true,
      leadCaptureComplete: true,
      googleFormAckSentAt: true,
      aiEnabled: true,
    },
  });
}

export async function updateWaContactLeadCapture(params: {
  contactId: string;
  organizationId: string;
  step: WaLeadCaptureStep;
  complete?: boolean;
  data?: {
    name?: string;
    email?: string;
    city?: string;
    requirementDescription?: string;
  };
}) {
  const result = await prisma.waContact.updateMany({
    where: {
      id: params.contactId,
      organizationId: params.organizationId,
    },
    data: {
      leadCaptureStep: params.step,
      ...(params.complete !== undefined
        ? { leadCaptureComplete: params.complete }
        : {}),
      ...(params.data?.name !== undefined ? { name: params.data.name } : {}),
      ...(params.data?.email !== undefined ? { email: params.data.email } : {}),
      ...(params.data?.city !== undefined ? { city: params.data.city } : {}),
      ...(params.data?.requirementDescription !== undefined
        ? { requirementDescription: params.data.requirementDescription }
        : {}),
      ...(params.complete
        ? {
            pipelineStage: "QUALIFIED",
            intent: "Lead",
          }
        : {}),
    },
  });

  if (
    result.count > 0 &&
    (params.complete || params.data !== undefined)
  ) {
    triggerWaCrmSheetSync(params.organizationId);
    queueLeadSyncFromWhatsApp({
      organizationId: params.organizationId,
      contactId: params.contactId,
    });
  }

  return result;
}

export async function updateWaContactFromFormResponse(params: {
  contactId: string;
  organizationId: string;
  data: {
    name?: string;
    email?: string;
    city?: string;
    requirementDescription?: string;
  };
}) {
  const result = await prisma.waContact.updateMany({
    where: {
      id: params.contactId,
      organizationId: params.organizationId,
      googleFormAckSentAt: null,
    },
    data: {
      ...(params.data.name ? { name: params.data.name } : {}),
      ...(params.data.email ? { email: params.data.email } : {}),
      ...(params.data.city ? { city: params.data.city } : {}),
      ...(params.data.requirementDescription
        ? { requirementDescription: params.data.requirementDescription }
        : {}),
      googleFormAckSentAt: new Date(),
      leadCaptureComplete: true,
      leadCaptureStep: "COMPLETE",
      pipelineStage: "QUALIFIED",
      intent: "Lead",
    },
  });

  if (result.count > 0) {
    triggerWaCrmSheetSync(params.organizationId);
  }

  return result;
}

export async function recordWaOutboundMessage(params: {
  organizationId: string;
  toPhone: string;
  body: string;
  messageType?: string;
  sentByUserId?: string | null;
  aiGenerated?: boolean;
  aiConfidence?: number | null;
  aiSourceTitles?: string[];
  externalId?: string | null;
}) {
  const phone = normalizeWhatsAppPhone(params.toPhone);
  if (!phone || !params.body.trim()) {
    return null;
  }

  if (params.externalId) {
    const existing = await prisma.waMessage.findUnique({
      where: { externalId: params.externalId },
    });
    if (existing) {
      return null;
    }
  }

  const contact = await prisma.waContact.upsert({
    where: {
      organizationId_phone: { organizationId: params.organizationId, phone },
    },
    create: {
      organizationId: params.organizationId,
      phone,
      name: displayNameFromPhone(phone),
      source: "whatsapp",
      lastMessageAt: new Date(),
      unreadCount: 0,
    },
    update: {
      lastMessageAt: new Date(),
      unreadCount: 0,
    },
  });

  const conversation = await ensureOpenConversation(
    params.organizationId,
    contact.id,
    params.body,
  );

  await prisma.waMessage.create({
    data: {
      organizationId: params.organizationId,
      conversationId: conversation.id,
      externalId: params.externalId ?? undefined,
      direction: "OUTBOUND",
      body: params.body.trim(),
      messageType: params.messageType ?? "text",
      sentByUserId: params.sentByUserId ?? undefined,
      aiGenerated: params.aiGenerated ?? false,
      aiConfidence: params.aiConfidence ?? undefined,
      aiSourceTitles: params.aiSourceTitles?.length
        ? params.aiSourceTitles
        : undefined,
    },
  });

  if (params.aiGenerated) {
    await prisma.waConversation.update({
      where: { id: conversation.id },
      data: { aiHandled: true },
    });
  }

  bustInboxListCache(params.organizationId);
  return { contactId: contact.id, conversationId: conversation.id };
}

/** Cache-safe rows: unstable_cache JSON round-trip turns Date into string. */
async function listWaConversationsRaw(organizationId: string) {
  const rows = await prisma.waConversation.findMany({
    where: { organizationId, status: "OPEN" },
    include: {
      contact: {
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  return rows.map((conversation) => ({
    ...conversation,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    contact: {
      ...conversation.contact,
      lastMessageAt: conversation.contact.lastMessageAt?.toISOString() ?? null,
      createdAt: conversation.contact.createdAt.toISOString(),
      updatedAt: conversation.contact.updatedAt.toISOString(),
    },
  }));
}

export async function listWaConversations(organizationId: string) {
  return unstable_cache(
    () => listWaConversationsRaw(organizationId),
    ["wa-conversations", organizationId],
    {
      revalidate: SCALE.INBOX_LIST_REVALIDATE_SEC,
      tags: [waInboxListTag(organizationId)],
    },
  )();
}

export async function getWaConversation(
  organizationId: string,
  conversationId: string,
) {
  return prisma.waConversation.findFirst({
    where: { id: conversationId, organizationId },
    include: {
      contact: {
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          sentBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function listWaContacts(organizationId: string) {
  return prisma.waContact.findMany({
    where: { organizationId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      conversations: {
        where: { status: "OPEN" },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
  });
}

export async function markConversationRead(
  organizationId: string,
  conversationId: string,
) {
  const conversation = await prisma.waConversation.findFirst({
    where: { id: conversationId, organizationId },
    select: { contactId: true },
  });

  if (!conversation) {
    return false;
  }

  await prisma.waContact.update({
    where: { id: conversation.contactId },
    data: { unreadCount: 0 },
  });

  return true;
}

export async function setWaContactAiEnabled(
  organizationId: string,
  contactId: string,
  aiEnabled: boolean,
) {
  const updated = await prisma.waContact.updateMany({
    where: { id: contactId, organizationId },
    data: { aiEnabled },
  });

  if (updated.count > 0) {
    bustInboxListCache(organizationId);
  }

  return updated.count > 0;
}

export { parseContactTags } from "@/lib/wa-crm-shared";

export function parseAiSourceTitles(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}
