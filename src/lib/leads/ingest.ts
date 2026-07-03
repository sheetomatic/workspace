import type {
  InboundLeadStatus,
  LeadCallingStatus,
  LeadSourceChannel,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma, withDbRetry } from "@/lib/db";
import { bridgeInboundLeadToFms } from "@/lib/leads/fms-bridge";
import {
  LEAD_CHANNEL_DEFAULTS,
  LEAD_SOURCE_COMING_SOON_CHANNELS,
  LEAD_SOURCE_PRIORITY_CHANNEL,
} from "@/lib/leads/channels";
import {
  categorizeLeadRequirement,
} from "@/lib/leads/categories";
import { inferLeadStageFromRequirement } from "@/lib/leads/stage-ai";
import {
  defaultGoogleSheetsLeadConfig,
  resolveGoogleSheetsLeadConfig,
} from "@/lib/leads/sheet-config";

export type LeadIngestInput = {
  organizationId: string;
  channel: LeadSourceChannel;
  externalId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  company?: string | null;
  address?: string | null;
  zipCode?: string | null;
  requirement?: string | null;
  sourceDetail?: string | null;
  meetingNotes?: string | null;
  callingStatus?: LeadCallingStatus;
  status?: InboundLeadStatus;
  assignedToId?: string | null;
  nextFollowUpAt?: Date | null;
  capturedAt?: Date | null;
  waContactId?: string | null;
  rawPayload?: Prisma.InputJsonValue;
  createFmsJob?: boolean;
  /** Skip ensureLeadConnections when the caller already bootstrapped connections. */
  skipConnectionSetup?: boolean;
  /** Known connection row — avoids a lookup per lead during bulk sheet sync. */
  connectionId?: string | null;
  /** When true, empty sheet cells must not wipe CRM fields already saved in the app. */
  sheetPull?: boolean;
  actorUserId?: string;
};

function normalizePhone(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits || null;
}

export async function ensureLeadConnections(organizationId: string) {
  await withDbRetry(async (client) => {
    const existing = await client.leadIngestConnection.count({
      where: { organizationId },
    });

    if (existing === 0) {
      const defaults = LEAD_CHANNEL_DEFAULTS;

      await client.leadIngestConnection.createMany({
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

    await enforceLeadSourcePhase(organizationId, client);
    await migrateGoogleSheetsLeadConfig(organizationId, client);
  });
}

async function migrateGoogleSheetsLeadConfig(
  organizationId: string,
  client: PrismaClient = prisma,
) {
  const connection = await client.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId,
        channel: "GOOGLE_SHEETS",
      },
    },
  });

  if (!connection) {
    return;
  }

  const resolved = resolveGoogleSheetsLeadConfig(connection.config);
  if (!resolved) {
    return;
  }

  const current =
    connection.config && typeof connection.config === "object"
      ? (connection.config as Record<string, unknown>)
      : {};

  const needsUpdate =
    current.gid !== resolved.gid ||
    current.spreadsheetId !== resolved.spreadsheetId ||
    !current.spreadsheetUrl;

  if (!needsUpdate) {
    return;
  }

  await client.leadIngestConnection.update({
    where: { id: connection.id },
    data: {
      config: {
        ...current,
        ...resolved,
      } as object,
    },
  });
}

/** Phase 1: Google Sheets only — disable coming-soon connectors. */
export async function enforceLeadSourcePhase(
  organizationId: string,
  client: PrismaClient = prisma,
) {
  await client.leadIngestConnection.updateMany({
    where: {
      organizationId,
      channel: { in: LEAD_SOURCE_COMING_SOON_CHANNELS },
    },
    data: { enabled: false },
  });
}

export async function ingestInboundLead(input: LeadIngestInput) {
  if (!input.skipConnectionSetup) {
    await ensureLeadConnections(input.organizationId);
  }

  const connection =
    input.connectionId !== undefined
      ? input.connectionId
        ? { id: input.connectionId }
        : null
      : await prisma.leadIngestConnection.findUnique({
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

  const requirement = input.requirement?.trim() || lead?.requirement || undefined;
  const requirementChanged =
    Boolean(input.requirement?.trim()) &&
    input.requirement?.trim() !== (lead?.requirement ?? "");
  const category =
    !lead || requirementChanged
      ? categorizeLeadRequirement(requirement)
      : lead.category ?? categorizeLeadRequirement(requirement);
  const pipeValue = lead?.pipeValue ?? lead?.quotationValue ?? undefined;

  const aiSuggestedStatus = inferLeadStageFromRequirement(requirement);
  const isNewLead = !lead;
  const resolvedStatus =
    input.status ?? (isNewLead ? aiSuggestedStatus : lead?.status ?? "NEW");

  const pickString = (
    incoming: string | null | undefined,
    existing: string | null | undefined,
  ) => {
    const trimmed = incoming?.trim();
    if (trimmed) {
      return trimmed;
    }
    if (input.sheetPull && existing?.trim()) {
      return existing.trim();
    }
    return trimmed || undefined;
  };

  const data = {
    connectionId: connection?.id ?? null,
    name: pickString(input.name, lead?.name),
    phone: phone ?? (input.sheetPull ? lead?.phone ?? undefined : undefined),
    email: pickString(input.email, lead?.email),
    city: pickString(input.city, lead?.city),
    company: pickString(input.company, lead?.company),
    address: pickString(input.address, lead?.address),
    zipCode: pickString(input.zipCode, lead?.zipCode),
    requirement: pickString(input.requirement, lead?.requirement) ?? requirement,
    sourceDetail: pickString(input.sourceDetail, lead?.sourceDetail),
    meetingNotes: pickString(input.meetingNotes, lead?.meetingNotes),
    callingStatus:
      input.callingStatus ??
      (input.sheetPull ? lead?.callingStatus : undefined),
    category,
    pipeValue: input.sheetPull ? lead?.pipeValue ?? pipeValue : pipeValue,
    quotationValue: input.sheetPull ? lead?.quotationValue : undefined,
    discussionNotes: input.sheetPull ? lead?.discussionNotes : undefined,
    aiSuggestedStatus,
    status: resolvedStatus,
    assignedToId: input.sheetPull ? lead?.assignedToId ?? undefined : input.assignedToId ?? undefined,
    nextFollowUpAt:
      input.nextFollowUpAt ??
      (input.sheetPull ? lead?.nextFollowUpAt ?? undefined : undefined),
    capturedAt: input.capturedAt ?? (input.sheetPull ? lead?.capturedAt ?? undefined : undefined),
    waContactId: input.waContactId ?? (input.sheetPull ? lead?.waContactId ?? undefined : undefined),
    rawPayload: input.rawPayload,
    externalId: externalId ?? undefined,
  };

  let created = false;

  if (lead) {
    lead = await prisma.inboundLead.update({
      where: { id: lead.id },
      data: {
        ...data,
        capturedAt:
          input.capturedAt !== undefined && input.capturedAt !== null
            ? input.capturedAt
            : undefined,
        rawPayload: input.rawPayload ?? lead.rawPayload ?? undefined,
      },
    });
  } else {
    created = true;
    lead = await prisma.inboundLead.create({
      data: {
        organizationId: input.organizationId,
        channel: input.channel,
        ...data,
        status: resolvedStatus,
        capturedAt: input.capturedAt ?? undefined,
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

  return { lead, fmsBridge, created };
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
