import "server-only";

import {
  WaCampaignRecipientStatus,
  WaCampaignStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import {
  listOfficialApprovedTemplates,
  sendOfficialTemplateMessage,
  type OfficialWaTemplate,
} from "@/lib/integrations/sheetomatic-official-wa";
import {
  buildTemplateVariables,
  parseVariableMap,
} from "@/lib/crm/wa-campaign-variables";

export const WA_CAMPAIGN_BATCH_SIZE = 20;
const MAX_SEND_ATTEMPTS = 3;

export type WaCampaignCounts = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function getOfficialCampaignCredentials(organizationId: string) {
  const credentials = await resolveWorkspaceWhatsAppCredentials(organizationId);
  const apiKey = credentials.redlavaApiKey?.trim() || null;
  if (!apiKey) {
    return {
      ok: false as const,
      error:
        "Official API key is not set for this workspace. Add it in WhatsApp Settings. Do not paste another client’s key.",
      credentials: null,
    };
  }
  return {
    ok: true as const,
    credentials: {
      apiKey,
      phoneId: credentials.redlavaPhoneId?.trim() || null,
    },
  };
}

export async function listApprovedCampaignTemplates(organizationId: string): Promise<{
  ok: boolean;
  templates: OfficialWaTemplate[];
  error?: string;
}> {
  const access = await getOfficialCampaignCredentials(organizationId);
  if (!access.ok) {
    return { ok: false, templates: [], error: access.error };
  }
  return listOfficialApprovedTemplates(access.credentials);
}

export function countRecipientRows(
  rows: Array<{ status: WaCampaignRecipientStatus }>,
): WaCampaignCounts {
  const counts: WaCampaignCounts = {
    total: rows.length,
    pending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };
  for (const row of rows) {
    if (row.status === "PENDING" || row.status === "SENDING") counts.pending += 1;
    else if (row.status === "SENT") counts.sent += 1;
    else if (row.status === "FAILED") counts.failed += 1;
    else if (row.status === "SKIPPED") counts.skipped += 1;
  }
  return counts;
}

export async function listWaCampaigns(organizationId: string) {
  const campaigns = await prisma.waCampaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      name: true,
      status: true,
      templateName: true,
      templateLanguage: true,
      templateCategory: true,
      pauseReason: true,
      createdAt: true,
    },
  });
  const ids = campaigns.map((campaign) => campaign.id);
  const grouped =
    ids.length === 0
      ? []
      : await prisma.waCampaignRecipient.groupBy({
          by: ["campaignId", "status"],
          where: { organizationId, campaignId: { in: ids } },
          _count: { _all: true },
        });
  const byCampaign = new Map<string, WaCampaignCounts>();
  for (const campaign of campaigns) {
    byCampaign.set(campaign.id, {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
  }
  for (const row of grouped) {
    const counts = byCampaign.get(row.campaignId);
    if (!counts) continue;
    counts.total += row._count._all;
    if (row.status === "PENDING" || row.status === "SENDING") counts.pending += row._count._all;
    else if (row.status === "SENT") counts.sent += row._count._all;
    else if (row.status === "FAILED") counts.failed += row._count._all;
    else if (row.status === "SKIPPED") counts.skipped += row._count._all;
  }
  return campaigns.map((campaign) => ({
    ...campaign,
    counts: byCampaign.get(campaign.id) ?? {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    },
  }));
}

export async function listWaCampaignOptions(organizationId: string) {
  const campaigns = await prisma.waCampaign.findMany({
    where: {
      organizationId,
      status: { in: [WaCampaignStatus.DRAFT, WaCampaignStatus.PAUSED, WaCampaignStatus.QUEUED, WaCampaignStatus.COMPLETED] },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      name: true,
      status: true,
      templateName: true,
      _count: { select: { recipients: true } },
    },
  });
  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    templateName: campaign.templateName,
    recipientCount: campaign._count.recipients,
  }));
}

export async function getWaCampaign(organizationId: string, campaignId: string) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      recipients: {
        orderBy: { createdAt: "asc" },
        take: 500,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              company: true,
              city: true,
              email: true,
              requirement: true,
              category: true,
            },
          },
        },
      },
    },
  });
  if (!campaign) return null;
  return {
    ...campaign,
    variableMap: parseVariableMap(campaign.variableMap),
    counts: countRecipientRows(campaign.recipients),
  };
}

export async function createWaCampaign(params: {
  organizationId: string;
  userId: string;
  name: string;
}) {
  const name = params.name.trim() || "Untitled campaign";
  return prisma.waCampaign.create({
    data: {
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      name,
      status: WaCampaignStatus.DRAFT,
    },
  });
}

export async function updateWaCampaignTemplate(params: {
  organizationId: string;
  campaignId: string;
  templateName: string;
  templateLanguage: string;
  templateCategory?: string | null;
  variableMap: Record<string, string>;
}) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: params.campaignId, organizationId: params.organizationId },
    select: { id: true, status: true },
  });
  if (!campaign) {
    return { ok: false as const, error: "Campaign not found." };
  }
  if (campaign.status === WaCampaignStatus.RUNNING) {
    return { ok: false as const, error: "Pause the campaign before changing the template." };
  }
  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: {
      templateName: params.templateName.trim(),
      templateLanguage: params.templateLanguage.trim() || "en",
      templateCategory: params.templateCategory?.trim() || null,
      variableMap: parseVariableMap(params.variableMap),
    },
  });
  return { ok: true as const };
}

export async function addLeadsToWaCampaign(params: {
  organizationId: string;
  campaignId: string;
  leadIds: string[];
  userId: string;
}) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: params.campaignId, organizationId: params.organizationId },
    select: { id: true, name: true, status: true },
  });
  if (!campaign) {
    return { ok: false as const, error: "Campaign not found.", added: 0, skipped: 0 };
  }
  if (campaign.status === WaCampaignStatus.RUNNING) {
    return {
      ok: false as const,
      error: "Pause sending before adding more people.",
      added: 0,
      skipped: 0,
    };
  }

  const uniqueIds = [...new Set(params.leadIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false as const, error: "Select at least one contact.", added: 0, skipped: 0 };
  }

  const leads = await prisma.inboundLead.findMany({
    where: {
      organizationId: params.organizationId,
      id: { in: uniqueIds },
      archivedAt: null,
      mergedIntoId: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
    },
  });

  const existing = await prisma.waCampaignRecipient.findMany({
    where: { campaignId: campaign.id, organizationId: params.organizationId },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((row) => row.phone));

  let added = 0;
  let skipped = 0;
  for (const lead of leads) {
    const phone = normalizeWhatsAppPhone(lead.phone ?? "");
    if (!phone) {
      skipped += 1;
      continue;
    }
    if (existingPhones.has(phone)) {
      skipped += 1;
      continue;
    }
    await prisma.waCampaignRecipient.create({
      data: {
        organizationId: params.organizationId,
        campaignId: campaign.id,
        leadId: lead.id,
        phone,
        name: lead.name?.trim() || lead.company?.trim() || null,
        status: WaCampaignRecipientStatus.PENDING,
      },
    });
    existingPhones.add(phone);
    added += 1;
    await logInboundLeadActivity({
      organizationId: params.organizationId,
      leadId: lead.id,
      type: "WHATSAPP",
      body: `Added to WhatsApp campaign “${campaign.name}”.`,
      createdByUserId: params.userId,
    });
  }

  skipped += Math.max(0, uniqueIds.length - leads.length);
  if (campaign.status === WaCampaignStatus.COMPLETED) {
    await prisma.waCampaign.update({
      where: { id: campaign.id },
      data: { status: WaCampaignStatus.DRAFT, completedAt: null, pauseReason: null },
    });
  }
  return { ok: true as const, added, skipped, campaignId: campaign.id };
}

export async function removeWaCampaignRecipient(params: {
  organizationId: string;
  campaignId: string;
  recipientId: string;
}) {
  const recipient = await prisma.waCampaignRecipient.findFirst({
    where: {
      id: params.recipientId,
      campaignId: params.campaignId,
      organizationId: params.organizationId,
    },
    select: { id: true, status: true },
  });
  if (!recipient) {
    return { ok: false as const, error: "Person not found on this campaign." };
  }
  if (recipient.status === WaCampaignRecipientStatus.SENT) {
    return { ok: false as const, error: "Already sent — cannot remove." };
  }
  if (recipient.status === WaCampaignRecipientStatus.SENDING) {
    return { ok: false as const, error: "This send is in progress." };
  }
  await prisma.waCampaignRecipient.delete({ where: { id: recipient.id } });
  return { ok: true as const };
}

export async function searchCampaignLeads(params: {
  organizationId: string;
  campaignId: string;
  q: string;
}) {
  const q = params.q.trim();
  if (q.length < 2) {
    return [];
  }
  const existing = await prisma.waCampaignRecipient.findMany({
    where: { campaignId: params.campaignId, organizationId: params.organizationId },
    select: { leadId: true },
  });
  const existingLeadIds = existing.map((row) => row.leadId).filter(Boolean) as string[];

  return prisma.inboundLead.findMany({
    where: {
      organizationId: params.organizationId,
      archivedAt: null,
      mergedIntoId: null,
      id: existingLeadIds.length ? { notIn: existingLeadIds } : undefined,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q.replace(/\D/g, "") } },
        { company: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      city: true,
    },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });
}

async function refreshCampaignCompletion(campaignId: string, organizationId: string) {
  const open = await prisma.waCampaignRecipient.count({
    where: {
      campaignId,
      organizationId,
      status: { in: [WaCampaignRecipientStatus.PENDING, WaCampaignRecipientStatus.SENDING] },
    },
  });
  if (open === 0) {
    await prisma.waCampaign.updateMany({
      where: {
        id: campaignId,
        organizationId,
        status: { in: [WaCampaignStatus.RUNNING, WaCampaignStatus.QUEUED] },
      },
      data: {
        status: WaCampaignStatus.COMPLETED,
        completedAt: new Date(),
        pauseReason: null,
      },
    });
    return true;
  }
  return false;
}

export async function startWaCampaignSend(params: {
  organizationId: string;
  campaignId: string;
}) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: params.campaignId, organizationId: params.organizationId },
  });
  if (!campaign) {
    return { ok: false as const, error: "Campaign not found." };
  }
  if (!campaign.templateName?.trim()) {
    return { ok: false as const, error: "Pick an approved template before sending." };
  }
  const pending = await prisma.waCampaignRecipient.count({
    where: {
      campaignId: campaign.id,
      organizationId: params.organizationId,
      status: WaCampaignRecipientStatus.PENDING,
    },
  });
  if (pending === 0) {
    return { ok: false as const, error: "Add contacts with a valid mobile number first." };
  }
  const access = await getOfficialCampaignCredentials(params.organizationId);
  if (!access.ok) {
    return { ok: false as const, error: access.error };
  }

  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: {
      status: WaCampaignStatus.RUNNING,
      startedAt: campaign.startedAt ?? new Date(),
      pausedAt: null,
      pauseReason: null,
      completedAt: null,
    },
  });

  return processWaCampaignBatch({
    organizationId: params.organizationId,
    campaignId: campaign.id,
  });
}

export async function pauseWaCampaign(params: {
  organizationId: string;
  campaignId: string;
  reason?: string;
}) {
  const updated = await prisma.waCampaign.updateMany({
    where: {
      id: params.campaignId,
      organizationId: params.organizationId,
      status: { in: [WaCampaignStatus.RUNNING, WaCampaignStatus.QUEUED] },
    },
    data: {
      status: WaCampaignStatus.PAUSED,
      pausedAt: new Date(),
      pauseReason: params.reason?.trim() || "Paused.",
    },
  });
  if (updated.count === 0) {
    return { ok: false as const, error: "Campaign is not sending." };
  }
  return { ok: true as const };
}

export async function resumeWaCampaign(params: {
  organizationId: string;
  campaignId: string;
}) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: params.campaignId, organizationId: params.organizationId },
    select: { id: true, status: true, templateName: true },
  });
  if (!campaign) {
    return { ok: false as const, error: "Campaign not found." };
  }
  if (campaign.status !== WaCampaignStatus.PAUSED && campaign.status !== WaCampaignStatus.DRAFT) {
    return { ok: false as const, error: "Resume is for a paused campaign." };
  }
  if (!campaign.templateName?.trim()) {
    return { ok: false as const, error: "Pick an approved template before sending." };
  }
  return startWaCampaignSend(params);
}

export async function processWaCampaignBatch(params: {
  organizationId: string;
  campaignId: string;
  batchSize?: number;
}) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: params.campaignId, organizationId: params.organizationId },
  });
  if (!campaign) {
    return { ok: false as const, error: "Campaign not found.", processed: 0, done: false };
  }
  if (campaign.status === WaCampaignStatus.PAUSED) {
    return { ok: true as const, processed: 0, done: false, paused: true as const };
  }
  if (campaign.status !== WaCampaignStatus.RUNNING && campaign.status !== WaCampaignStatus.QUEUED) {
    return { ok: true as const, processed: 0, done: campaign.status === WaCampaignStatus.COMPLETED };
  }
  if (!campaign.templateName?.trim()) {
    await pauseWaCampaign({
      organizationId: params.organizationId,
      campaignId: campaign.id,
      reason: "Template missing.",
    });
    return { ok: false as const, error: "Pick an approved template before sending.", processed: 0, done: false };
  }

  const access = await getOfficialCampaignCredentials(params.organizationId);
  if (!access.ok) {
    await pauseWaCampaign({
      organizationId: params.organizationId,
      campaignId: campaign.id,
      reason: access.error,
    });
    return { ok: false as const, error: access.error, processed: 0, done: false };
  }

  const batchSize = params.batchSize ?? WA_CAMPAIGN_BATCH_SIZE;
  await prisma.waCampaignRecipient.updateMany({
    where: {
      campaignId: campaign.id,
      organizationId: params.organizationId,
      status: WaCampaignRecipientStatus.SENDING,
      lastAttemptAt: { lt: new Date(Date.now() - 2 * 60_000) },
    },
    data: { status: WaCampaignRecipientStatus.PENDING },
  });
  const recipients = await prisma.waCampaignRecipient.findMany({
    where: {
      campaignId: campaign.id,
      organizationId: params.organizationId,
      status: WaCampaignRecipientStatus.PENDING,
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    include: {
      lead: {
        select: {
          name: true,
          phone: true,
          company: true,
          city: true,
          email: true,
          requirement: true,
          category: true,
        },
      },
    },
  });

  if (recipients.length === 0) {
    const done = await refreshCampaignCompletion(campaign.id, params.organizationId);
    return { ok: true as const, processed: 0, done };
  }

  const variableMap = parseVariableMap(campaign.variableMap);
  let processed = 0;

  for (const recipient of recipients) {
    const stillRunning = await prisma.waCampaign.findFirst({
      where: { id: campaign.id, organizationId: params.organizationId },
      select: { status: true, templateName: true },
    });
    if (stillRunning?.status !== WaCampaignStatus.RUNNING) {
      break;
    }

    const claimed = await prisma.waCampaignRecipient.updateMany({
      where: {
        id: recipient.id,
        organizationId: params.organizationId,
        status: WaCampaignRecipientStatus.PENDING,
      },
      data: {
        status: WaCampaignRecipientStatus.SENDING,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        error: null,
      },
    });
    if (claimed.count === 0) continue;

    const phone = normalizeWhatsAppPhone(recipient.phone);
    if (!phone) {
      await prisma.waCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: WaCampaignRecipientStatus.SKIPPED,
          error: "Invalid mobile number.",
          errorCode: "INVALID_PHONE",
        },
      });
      processed += 1;
      continue;
    }

    const contact = {
      name: recipient.lead?.name ?? recipient.name,
      phone,
      company: recipient.lead?.company,
      city: recipient.lead?.city,
      email: recipient.lead?.email,
      requirement: recipient.lead?.requirement,
      category: recipient.lead?.category,
    };
    const placeholders =
      extractCountFromMap(variableMap) ||
      Math.max(
        Object.keys(variableMap).reduce((max, key) => Math.max(max, Number(key) || 0), 0),
        0,
      );
    const templateVariables = buildTemplateVariables(
      placeholders || Object.keys(variableMap).length,
      variableMap,
      contact,
    );
    const userMessageId = `crm_${campaign.id}_${recipient.id}`;

    const send = await sendOfficialTemplateMessage(
      {
        toPhone: phone,
        templateName: campaign.templateName,
        language: campaign.templateLanguage || "en",
        templateVariables,
        userMessageId,
      },
      access.credentials,
    );

    if (send.insufficientBalance) {
      await prisma.waCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: WaCampaignRecipientStatus.PENDING,
          error: send.error,
          errorCode: send.errorCode,
        },
      });
      await pauseWaCampaign({
        organizationId: params.organizationId,
        campaignId: campaign.id,
        reason: send.error,
      });
      return {
        ok: false as const,
        error: send.error,
        processed,
        done: false,
        paused: true as const,
      };
    }

    if (send.ok) {
      await prisma.waCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: WaCampaignRecipientStatus.SENT,
          error: null,
          errorCode: null,
          userMessageId: send.userMessageId || userMessageId,
          waMessageId: send.waMessageId || null,
          sentAt: new Date(),
        },
      });
      if (recipient.leadId) {
        await logInboundLeadActivity({
          organizationId: params.organizationId,
          leadId: recipient.leadId,
          type: "WHATSAPP",
          body: `Campaign “${campaign.name}” sent template ${campaign.templateName}.`,
          createdByUserId: null,
        });
      }
    } else {
      const attempts = recipient.attempts + 1;
      const retry = !send.marketingEngagementBlock && attempts < MAX_SEND_ATTEMPTS && send.http >= 500;
      await prisma.waCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: retry
            ? WaCampaignRecipientStatus.PENDING
            : WaCampaignRecipientStatus.FAILED,
          error: send.error,
          errorCode: send.errorCode,
          userMessageId: send.userMessageId || userMessageId,
          waMessageId: send.waMessageId || null,
        },
      });
      if (send.pauseCampaign && send.http === 401) {
        await pauseWaCampaign({
          organizationId: params.organizationId,
          campaignId: campaign.id,
          reason: send.error,
        });
        return {
          ok: false as const,
          error: send.error,
          processed,
          done: false,
          paused: true as const,
        };
      }
    }
    processed += 1;
  }

  const done = await refreshCampaignCompletion(campaign.id, params.organizationId);
  return { ok: true as const, processed, done };
}

function extractCountFromMap(map: Record<string, string>): number {
  return Object.keys(map).reduce((max, key) => Math.max(max, Number(key) || 0), 0);
}

export async function processRunningWaCampaigns(batchSize = WA_CAMPAIGN_BATCH_SIZE) {
  const running = await prisma.waCampaign.findMany({
    where: { status: { in: [WaCampaignStatus.RUNNING, WaCampaignStatus.QUEUED] } },
    select: { id: true, organizationId: true },
    take: 8,
    orderBy: { updatedAt: "asc" },
  });
  const results = [];
  for (const campaign of running) {
    const result = await processWaCampaignBatch({
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      batchSize,
    });
    results.push({ campaignId: campaign.id, ...result });
  }
  return { campaigns: running.length, results };
}
