import type {
  InboundLeadStatus,
  LeadSourceChannel,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { bridgeInboundLeadToFms } from "@/lib/leads/fms-bridge";
import {
  LEAD_CHANNEL_DEFAULTS,
  LEAD_SOURCE_COMING_SOON_CHANNELS,
  LEAD_SOURCE_PRIORITY_CHANNEL,
} from "@/lib/leads/channels";
import { defaultGoogleSheetsLeadConfig } from "@/lib/leads/sheet-config";

export type LeadIngestInput = {
  organizationId: string;
  channel: LeadSourceChannel;
  externalId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  requirement?: string | null;
  sourceDetail?: string | null;
  status?: InboundLeadStatus;
  assignedToId?: string | null;
  nextFollowUpAt?: Date | null;
  capturedAt?: Date | null;
  waContactId?: string | null;
  rawPayload?: Prisma.InputJsonValue;
  createFmsJob?: boolean;
  actorUserId?: string;
};

function normalizePhone(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits || null;
}

export async function ensureLeadConnections(organizationId: string) {
  const existing = await prisma.leadIngestConnection.count({
    where: { organizationId },
  });

  if (existing === 0) {
    const defaults = LEAD_CHANNEL_DEFAULTS;

    await prisma.leadIngestConnection.createMany({
      data: defaults.map((item) => ({
        organizationId,
        channel: item.channel,
        label: item.label,
        enabled: item.channel === LEAD_SOURCE_PRIORITY_CHANNEL,
        config:
          item.channel === LEAD_SOURCE_PRIORITY_CHANNEL
            ? (defaultGoogleSheetsLeadConfig() as object)
            : undefined,
      })),
      skipDuplicates: true,
    });
  }

  await enforceLeadSourcePhase(organizationId);
}

/** Phase 1: Google Sheets only — disable coming-soon connectors. */
export async function enforceLeadSourcePhase(organizationId: string) {
  await prisma.leadIngestConnection.updateMany({
    where: {
      organizationId,
      channel: { in: LEAD_SOURCE_COMING_SOON_CHANNELS },
    },
    data: { enabled: false },
  });
}

export async function ingestInboundLead(input: LeadIngestInput) {
  await ensureLeadConnections(input.organizationId);

  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: input.organizationId,
        channel: input.channel,
      },
    },
  });

  const phone = normalizePhone(input.phone);
  const externalId = input.externalId?.trim() || null;

  let lead = externalId
    ? await prisma.inboundLead.findUnique({
        where: {
          organizationId_channel_externalId: {
            organizationId: input.organizationId,
            channel: input.channel,
            externalId,
          },
        },
      })
    : null;

  if (!lead && phone) {
    lead = await prisma.inboundLead.findFirst({
      where: {
        organizationId: input.organizationId,
        channel: input.channel,
        phone,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const data = {
    connectionId: connection?.id ?? null,
    name: input.name?.trim() || undefined,
    phone: phone ?? undefined,
    email: input.email?.trim() || undefined,
    city: input.city?.trim() || undefined,
    requirement: input.requirement?.trim() || undefined,
    sourceDetail: input.sourceDetail?.trim() || undefined,
    status: input.status,
    assignedToId: input.assignedToId ?? undefined,
    nextFollowUpAt: input.nextFollowUpAt ?? undefined,
    capturedAt: input.capturedAt ?? undefined,
    waContactId: input.waContactId ?? undefined,
    rawPayload: input.rawPayload,
    externalId: externalId ?? undefined,
  };

  let isNew = false;

  if (lead) {
    lead = await prisma.inboundLead.update({
      where: { id: lead.id },
      data: {
        ...data,
        rawPayload: input.rawPayload ?? lead.rawPayload ?? undefined,
      },
    });
  } else {
    isNew = true;
    lead = await prisma.inboundLead.create({
      data: {
        organizationId: input.organizationId,
        channel: input.channel,
        ...data,
        status: input.status ?? "NEW",
      },
    });
  }

  let fmsBridge: Awaited<ReturnType<typeof bridgeInboundLeadToFms>> | null = null;
  if (input.createFmsJob !== false) {
    fmsBridge = await bridgeInboundLeadToFms({
      organizationId: input.organizationId,
      lead,
      actorUserId: input.actorUserId,
    });
  }

  return { lead, fmsBridge, created: isNew };
}

export function queueLeadSyncFromWhatsApp(params: {
  organizationId: string;
  contactId: string;
}) {
  void syncLeadFromWhatsAppContact(params).catch((error) => {
    console.error("leads machine whatsapp sync", error);
  });
}

export async function syncLeadFromWhatsAppContact(params: {
  organizationId: string;
  contactId: string;
}) {
  const contact = await prisma.waContact.findFirst({
    where: {
      id: params.contactId,
      organizationId: params.organizationId,
    },
  });

  if (!contact) {
    return null;
  }

  return ingestInboundLead({
    organizationId: params.organizationId,
    channel: "WHATSAPP",
    externalId: contact.phone,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    city: contact.city,
    requirement: contact.requirementDescription,
    sourceDetail: contact.intent ?? undefined,
    capturedAt: contact.createdAt,
    waContactId: contact.id,
    assignedToId: contact.assignedToId,
    nextFollowUpAt: contact.nextFollowUpAt,
    rawPayload: {
      pipelineStage: contact.pipelineStage,
      leadCaptureComplete: contact.leadCaptureComplete,
    },
    createFmsJob: true,
  });
}
