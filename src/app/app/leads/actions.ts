"use server";

import { revalidatePath } from "next/cache";
import type { InboundLeadStatus, LeadSourceChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateLeadMachineApiKey } from "@/lib/leads/api-auth";
import { ensureLeadConnections, enforceLeadSourcePhase, ingestInboundLead } from "@/lib/leads/ingest";
import { bridgeInboundLeadToFms } from "@/lib/leads/fms-bridge";
import { pullLeadsFromConnection } from "@/lib/leads/sync-sources";
import { buildGoogleSheetsLeadConfigFromInput } from "@/lib/leads/sheet-config";
import { testLeadsGoogleSheetAccess } from "@/lib/leads/google-sheets";
import {
  formatLeadSyncCounts,
  formatLeadSyncError,
} from "@/lib/leads/sync-messages";
import { isLeadSourceComingSoon } from "@/lib/leads/channels";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { isActiveOrgMember } from "@/lib/assignee-org";

export async function assignInboundLead(leadId: string, assigneeUserId: string | null) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  if (
    assigneeUserId &&
    !(await isActiveOrgMember(user.organizationId, assigneeUserId))
  ) {
    return {
      ok: false,
      message: "Selected assignee must be an active member of this workspace.",
    };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { assignedToId: assigneeUserId || null },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function updateInboundLeadStatus(leadId: string, status: InboundLeadStatus) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId: user.organizationId },
    data: { status },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function scheduleInboundLeadFollowUp(params: {
  leadId: string;
  scheduledAt: string;
  notes?: string;
  assigneeUserId?: string | null;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const scheduledAt = new Date(params.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, message: "Invalid date." };
  }

  await prisma.inboundLeadFollowUp.create({
    data: {
      organizationId: user.organizationId,
      leadId: params.leadId,
      scheduledAt,
      notes: params.notes?.trim() || null,
      assigneeUserId: params.assigneeUserId || user.id,
      createdByUserId: user.id,
    },
  });

  await prisma.inboundLead.updateMany({
    where: { id: params.leadId, organizationId: user.organizationId },
    data: { nextFollowUpAt: scheduledAt, status: "FOLLOW_UP" },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function completeInboundLeadFollowUp(followUpId: string) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  await prisma.inboundLeadFollowUp.updateMany({
    where: { id: followUpId, organizationId: user.organizationId },
    data: { completedAt: new Date() },
  });

  revalidatePath("/app/leads");
  return { ok: true };
}

export async function bridgeLeadToFmsAction(leadId: string) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
  });

  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }

  const result = await bridgeInboundLeadToFms({
    organizationId: user.organizationId,
    lead,
    actorUserId: user.id,
  });

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "no_lead_fms_template"
          ? "Activate a Lead to Closure FMS workflow first."
          : "Could not create FMS job.",
    };
  }

  revalidatePath("/app/leads");
  return { ok: true, instanceId: result.instanceId };
}

export async function syncLeadChannelNow(channel: LeadSourceChannel) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(channel)) {
    return { ok: false, message: "This connector is coming soon." };
  }

  const result = await pullLeadsFromConnection({
    organizationId: user.organizationId,
    channel,
  });

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  if (!result.ok) {
    return { ok: false, message: formatLeadSyncError(result.reason) };
  }

  return {
    ok: true,
    imported: result.imported,
    counts: result.counts,
    message: formatLeadSyncCounts(
      result.counts ?? {
        processed: result.imported,
        created: result.imported,
        updated: 0,
      },
    ),
  };
}

export async function testGoogleSheetsLeadConnection(params: {
  spreadsheetUrl: string;
  sheetTab: string;
  headerRow: number;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const config = buildGoogleSheetsLeadConfigFromInput(params);

  try {
    const result = await testLeadsGoogleSheetAccess(config);
    return {
      ok: true,
      message: `Connected via ${result.source}. Found ${result.leadCount} lead row${result.leadCount === 1 ? "" : "s"} (${result.rowCount} sheet rows).`,
      leadCount: result.leadCount,
      rowCount: result.rowCount,
      source: result.source,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not reach the Google Sheet.",
    };
  }
}

export async function updateLeadConnection(params: {
  channel: LeadSourceChannel;
  enabled: boolean;
  configJson: string;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  if (isLeadSourceComingSoon(params.channel)) {
    return { ok: false, message: "This connector is coming soon." };
  }

  await ensureLeadConnections(user.organizationId);

  let config: Record<string, unknown> = {};
  if (params.configJson.trim()) {
    try {
      config = JSON.parse(params.configJson) as Record<string, unknown>;
    } catch {
      return { ok: false, message: "Config must be valid JSON." };
    }
  }

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: params.channel,
      },
    },
    data: { enabled: params.enabled, config: config as Prisma.InputJsonValue },
  });

  revalidatePath("/app/leads/settings");
  return { ok: true };
}

export async function updateGoogleSheetsLeadConfig(params: {
  enabled: boolean;
  spreadsheetUrl: string;
  sheetTab: string;
  headerRow: number;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  await ensureLeadConnections(user.organizationId);

  const config = buildGoogleSheetsLeadConfigFromInput({
    spreadsheetUrl: params.spreadsheetUrl,
    sheetTab: params.sheetTab,
    headerRow: params.headerRow,
  });

  await prisma.leadIngestConnection.update({
    where: {
      organizationId_channel: {
        organizationId: user.organizationId,
        channel: "GOOGLE_SHEETS",
      },
    },
    data: {
      enabled: params.enabled,
      config: config as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/app/leads/settings");

  if (!params.enabled) {
    revalidatePath("/app/leads");
    return { ok: true, message: "Google Sheets settings saved." };
  }

  const sync = await pullLeadsFromConnection({
    organizationId: user.organizationId,
    channel: "GOOGLE_SHEETS",
  });

  revalidatePath("/app/leads");
  revalidatePath("/app/leads/settings");

  if (!sync.ok) {
    return {
      ok: false,
      message: `Saved, but sync failed: ${formatLeadSyncError(sync.reason)}`,
    };
  }

  return {
    ok: true,
    message: `Live and connected. ${formatLeadSyncCounts(
      sync.counts ?? {
        processed: sync.imported,
        created: sync.imported,
        updated: 0,
      },
    )}`,
    imported: sync.imported,
    counts: sync.counts,
  };
}

export async function regenerateLeadsApiKey() {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Admin only." };
  }

  const { key, hash, hint } = generateLeadMachineApiKey();

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      leadMachineApiKeyHash: hash,
      leadMachineApiKeyHint: hint,
    },
  });

  revalidatePath("/app/leads/settings");
  return { ok: true, apiKey: key };
}

export async function createManualInboundLead(formData: FormData) {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const name = formData.get("name")?.toString().trim() || "";
  const phone = formData.get("phone")?.toString().trim() || "";
  const requirement = formData.get("requirement")?.toString().trim() || "";

  if (!name && !phone) {
    return { ok: false, message: "Name or phone required." };
  }

  await ingestInboundLead({
    organizationId: user.organizationId,
    channel: "MANUAL",
    externalId: `manual-${Date.now()}`,
    name,
    phone,
    requirement,
    capturedAt: new Date(),
    actorUserId: user.id,
    createFmsJob: true,
  });

  revalidatePath("/app/leads");
  return { ok: true };
}
