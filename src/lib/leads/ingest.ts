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
import { leadHasRequiredContact, leadPhoneDigits } from "@/lib/leads/contact-validation";
import {
  findDuplicateLeads,
  type DuplicateLeadMatch,
} from "@/lib/leads/duplicates";
import { triggerLeadNurtureEvent } from "@/lib/leads/nurture/run";
import { computeLeadScore } from "@/lib/leads/scoring";
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
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  campaign?: string | null;
  landingPage?: string | null;
  pipeValue?: number | null;
  expectedCloseAt?: Date | null;
  winProbability?: number | null;
  createdByUserId?: string | null;
  rawPayload?: Prisma.InputJsonValue;
  createFmsJob?: boolean;
  /** Skip ensureLeadConnections when the caller already bootstrapped connections. */
  skipConnectionSetup?: boolean;
  /** Known connection row — avoids a lookup per lead during bulk sheet sync. */
  connectionId?: string | null;
  /** When true, empty sheet cells must not wipe CRM fields already saved in the app. */
  sheetPull?: boolean;
  actorUserId?: string;
  /**
   * When true (manual create), refuse to create if phone/email matches another lead.
   * Ingest/API soft-links to the best match instead.
   */
  hardBlockDuplicates?: boolean;
};

function normalizePhone(phone: string | null | undefined) {
  return leadPhoneDigits(phone);
}

export async function ensureLeadConnections(organizationId: string) {
  await withDbRetry(async (client) => {
    const existing = await client.leadIngestConnection.findMany({
      where: { organizationId },
      select: { channel: true },
    });
    const existingChannels = new Set(existing.map((row) => row.channel));

    const missing = LEAD_CHANNEL_DEFAULTS.filter(
      (item) => !existingChannels.has(item.channel),
    );

    if (missing.length > 0) {
      await client.leadIngestConnection.createMany({
        data: missing.map((item) => ({
          organizationId,
          channel: item.channel,
          label: item.label,
          enabled:
            existing.length === 0 &&
            item.channel === LEAD_SOURCE_PRIORITY_CHANNEL,
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

/** Keep non-live connectors disabled (currently MANUAL only). */
export async function enforceLeadSourcePhase(
  organizationId: string,
  client: PrismaClient = prisma,
) {
  if (LEAD_SOURCE_COMING_SOON_CHANNELS.length === 0) {
    return;
  }
  await client.leadIngestConnection.updateMany({
    where: {
      organizationId,
      channel: { in: LEAD_SOURCE_COMING_SOON_CHANNELS },
    },
    data: { enabled: false },
  });
}

export type LeadIngestResult = {
  lead: Awaited<ReturnType<typeof prisma.inboundLead.create>> | null;
  fmsBridge: Awaited<ReturnType<typeof bridgeInboundLeadToFms>> | null;
  created: boolean;
  skipped?: true;
  duplicate?: boolean;
  matches?: DuplicateLeadMatch[];
  linkedExisting?: boolean;
};

export async function ingestInboundLead(
  input: LeadIngestInput,
): Promise<LeadIngestResult> {
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

  if (!lead && !phone) {
    return { lead: null, fmsBridge: null, created: false, skipped: true as const };
  }

  if (lead && !phone && !input.sheetPull) {
    return { lead: null, fmsBridge: null, created: false, skipped: true as const };
  }

  if (lead && input.sheetPull && !phone && !leadHasRequiredContact(lead.phone)) {
    await prisma.inboundLead.delete({ where: { id: lead.id } });
    return { lead: null, fmsBridge: null, created: false, skipped: true as const };
  }

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

  let duplicateMatches: DuplicateLeadMatch[] = [];
  let linkedExisting = false;

  if (!lead) {
    duplicateMatches = await findDuplicateLeads(input.organizationId, {
      phone,
      email: input.email,
    });
    const activeMatches = duplicateMatches.filter((m) => !m.archivedAt);

    if (activeMatches.length > 0) {
      if (input.hardBlockDuplicates) {
        return {
          lead: null,
          fmsBridge: null,
          created: false,
          duplicate: true,
          matches: activeMatches,
        };
      }

      // Soft-link: update the newest active match instead of creating a parallel lead.
      const linked = await prisma.inboundLead.findFirst({
        where: { id: activeMatches[0].id, organizationId: input.organizationId },
      });
      if (linked) {
        lead = linked;
        linkedExisting = true;
      }
    }
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

  const resolvedPhone =
    phone ?? (input.sheetPull ? lead?.phone ?? undefined : undefined);
  const resolvedEmail = pickString(input.email, lead?.email);
  const resolvedCompany = pickString(input.company, lead?.company);
  const resolvedRequirement =
    pickString(input.requirement, lead?.requirement) ?? requirement;
  const resolvedCalling =
    input.callingStatus ??
    (input.sheetPull ? lead?.callingStatus : undefined) ??
    lead?.callingStatus ??
    "NOT_CALLED";
  const resolvedPipe =
    input.pipeValue != null && Number.isFinite(input.pipeValue)
      ? input.pipeValue
      : input.sheetPull
        ? lead?.pipeValue ?? pipeValue
        : pipeValue;

  const { score, temperature } = computeLeadScore({
    phone: resolvedPhone,
    email: resolvedEmail,
    company: resolvedCompany,
    requirement: resolvedRequirement,
    status: resolvedStatus,
    callingStatus: resolvedCalling,
    pipeValue: resolvedPipe,
  });

  const data = {
    connectionId: connection?.id ?? null,
    name: pickString(input.name, lead?.name),
    phone: resolvedPhone,
    email: resolvedEmail,
    city: pickString(input.city, lead?.city),
    company: resolvedCompany,
    address: pickString(input.address, lead?.address),
    zipCode: pickString(input.zipCode, lead?.zipCode),
    requirement: resolvedRequirement,
    sourceDetail: pickString(input.sourceDetail, lead?.sourceDetail),
    meetingNotes: pickString(input.meetingNotes, lead?.meetingNotes),
    callingStatus:
      input.callingStatus ??
      (input.sheetPull ? lead?.callingStatus : undefined),
    category,
    pipeValue: resolvedPipe,
    quotationValue: input.sheetPull ? lead?.quotationValue : undefined,
    discussionNotes: input.sheetPull ? lead?.discussionNotes : undefined,
    aiSuggestedStatus,
    status: resolvedStatus,
    score,
    temperature,
    utmSource: pickString(input.utmSource, lead?.utmSource),
    utmMedium: pickString(input.utmMedium, lead?.utmMedium),
    utmCampaign: pickString(input.utmCampaign, lead?.utmCampaign),
    utmContent: pickString(input.utmContent, lead?.utmContent),
    utmTerm: pickString(input.utmTerm, lead?.utmTerm),
    campaign: pickString(input.campaign, lead?.campaign),
    landingPage: pickString(input.landingPage, lead?.landingPage),
    expectedCloseAt:
      input.expectedCloseAt !== undefined
        ? input.expectedCloseAt
        : input.sheetPull
          ? lead?.expectedCloseAt ?? undefined
          : undefined,
    winProbability:
      input.winProbability !== undefined && input.winProbability !== null
        ? input.winProbability
        : input.sheetPull
          ? lead?.winProbability ?? undefined
          : undefined,
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
    const crossChannelLink = linkedExisting && lead.channel !== input.channel;
    lead = await prisma.inboundLead.update({
      where: { id: lead.id },
      data: {
        ...data,
        // Do not overwrite identity fields when soft-linking a cross-channel duplicate.
        ...(crossChannelLink
          ? {
              connectionId: undefined,
              externalId: undefined,
              channel: undefined,
            }
          : {}),
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
        createdByUserId: input.createdByUserId ?? input.actorUserId ?? undefined,
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

  if (created && phone) {
    void triggerLeadNurtureEvent({
      organizationId: input.organizationId,
      leadId: lead.id,
      event: "welcome",
    }).catch((error) => {
      console.error("lead welcome nurture", error);
    });
  }

  return {
    lead,
    fmsBridge,
    created,
    ...(duplicateMatches.length > 0
      ? { duplicate: true, matches: duplicateMatches, linkedExisting }
      : {}),
  };
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
  await ensureLeadConnections(params.organizationId);

  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: "WHATSAPP",
      },
    },
    select: { id: true, enabled: true },
  });

  if (!connection?.enabled) {
    return null;
  }

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
    connectionId: connection.id,
    skipConnectionSetup: true,
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
