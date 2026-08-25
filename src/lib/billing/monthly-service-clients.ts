import type { MonthlyServiceClient, MonthlyServiceClientStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addUtcDays,
  daysUntilDue,
  formatBillingDate,
  isPastDueDate,
  startOfUtcDay,
} from "@/lib/billing/dates";
import {
  formatInrPaise,
  parseRupeesInput,
  paiseToRupees,
  rupeesToPaise,
} from "@/lib/billing/money";
import type {
  MonthlyServiceAssigneeOption,
  MonthlyServiceClientRow,
  MonthlyServiceLeadOption,
} from "@/lib/billing/monthly-service-clients.shared";
import {
  defaultPipeValueForCategory,
  leadCategoryShortLabel,
  resolveLeadCategoryId,
} from "@/lib/leads/categories";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { mergeLeadContactWhere } from "@/lib/leads/contact-validation";
import { leadSearchWhere } from "@/lib/leads/search";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";

export type MonthlyServiceClientInput = {
  inboundLeadId?: string | null;
  name: string;
  company?: string | null;
  phone: string;
  email?: string | null;
  category: string;
  monthlyRateRupees?: string | null;
  startedAt?: string | null;
  assignedToId?: string | null;
  workNote?: string | null;
  notes?: string | null;
};

export function parseMonthlyServiceClientInput(input: MonthlyServiceClientInput) {
  const name = input.name.trim();
  const phone = normalizeWhatsAppPhone(input.phone);
  if (name.length < 2) {
    return { ok: false as const, message: "Enter the client name." };
  }
  if (!phone) {
    return { ok: false as const, message: "Enter a WhatsApp number." };
  }
  const category = resolveLeadCategoryId(input.category);
  const parsedRate = parseRupeesInput(String(input.monthlyRateRupees ?? "").trim());
  const monthlyRatePaise =
    parsedRate && parsedRate > 0
      ? parsedRate
      : rupeesToPaise(defaultPipeValueForCategory(category));
  const started = input.startedAt?.trim()
    ? startOfUtcDay(new Date(`${input.startedAt}T00:00:00.000Z`))
    : startOfUtcDay(new Date());
  if (Number.isNaN(started.getTime())) {
    return { ok: false as const, message: "Enter a valid start date." };
  }
  return {
    ok: true as const,
    value: {
      inboundLeadId: input.inboundLeadId?.trim() || null,
      name,
      company: input.company?.trim() || null,
      phone,
      email: input.email?.trim() || null,
      category,
      monthlyRatePaise,
      startedAt: started,
      nextDueAt: addUtcDays(started, 30),
      assignedToId: input.assignedToId?.trim() || null,
      workNote: input.workNote?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  };
}

export function toMonthlyServiceClientRow(
  client: MonthlyServiceClient & {
    assignedTo?: { name: string | null } | null;
  },
  now = new Date(),
): MonthlyServiceClientRow {
  const daysLeft = daysUntilDue(client.nextDueAt, now);
  const expired = isPastDueDate(client.nextDueAt, now);
  const displayStatus =
    client.status === "CANCELLED"
      ? "CANCELLED"
      : expired
        ? "DUE"
        : client.status;
  return {
    id: client.id,
    inboundLeadId: client.inboundLeadId,
    name: client.name,
    company: client.company,
    phone: client.phone,
    phoneLabel: formatWhatsAppPhone(client.phone),
    email: client.email,
    category: client.category,
    categoryLabel: leadCategoryShortLabel(client.category),
    monthlyRatePaise: client.monthlyRatePaise,
    monthlyRateLabel: formatInrPaise(client.monthlyRatePaise),
    startedAt: client.startedAt,
    startedLabel: formatBillingDate(client.startedAt),
    nextDueAt: client.nextDueAt,
    nextDueLabel: formatBillingDate(client.nextDueAt),
    daysLeft,
    daysLeftLabel: expired
      ? `Due ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`
      : daysLeft === 0
        ? "Due today"
        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    status: displayStatus,
    assignedToId: client.assignedToId,
    assignedToName: client.assignedTo?.name ?? null,
    workNote: client.workNote,
    notes: client.notes,
    dueSoon: client.status === "ACTIVE" && !expired && daysLeft <= 10,
  };
}

export async function listMonthlyServiceClients(
  organizationId: string,
  now = new Date(),
) {
  const rows = await prisma.monthlyServiceClient.findMany({
    where: { organizationId },
    include: { assignedTo: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { nextDueAt: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => toMonthlyServiceClientRow(row, now));
}

export async function searchMonthlyServiceLeads(
  organizationId: string,
  raw: string,
): Promise<MonthlyServiceLeadOption[]> {
  const q = raw.trim();
  if (q.length < 2) return [];
  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere(
      {
        organizationId,
        mergedIntoId: null,
        ...leadSearchWhere(q),
      },
      { includeArchived: true },
    ),
    orderBy: [{ capturedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      company: true,
      category: true,
      assignedToId: true,
      status: true,
    },
  });
  return leads.map((lead) => ({
    id: lead.id,
    name: lead.name?.trim() || "Unnamed lead",
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    category: resolveLeadCategoryId(lead.category),
    assignedToId: lead.assignedToId,
    status: lead.status,
  }));
}

export async function listMonthlyServiceAssignees(
  organizationId: string,
): Promise<MonthlyServiceAssigneeOption[]> {
  const members = await prisma.membership.findMany({
    where: { organizationId, deactivatedAt: null },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return members.map((row) => ({
    id: row.user.id,
    name: row.user.name?.trim() || row.user.email,
  }));
}

export async function upsertMonthlyServiceClient(params: {
  organizationId: string;
  createdByUserId: string;
  input: MonthlyServiceClientInput;
}) {
  const parsed = parseMonthlyServiceClientInput(params.input);
  if (!parsed.ok) return parsed;
  const value = parsed.value;

  const lead = value.inboundLeadId
    ? await prisma.inboundLead.findFirst({
        where: { id: value.inboundLeadId, organizationId: params.organizationId },
        select: { id: true, status: true },
      })
    : null;
  if (value.inboundLeadId && !lead) {
    return { ok: false as const, message: "That lead is not in this workspace." };
  }
  if (value.assignedToId) {
    const member = await prisma.membership.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: value.assignedToId,
        deactivatedAt: null,
      },
      select: { id: true },
    });
    if (!member) {
      return { ok: false as const, message: "Pick a teammate from this workspace." };
    }
  }

  const existing = value.inboundLeadId
    ? await prisma.monthlyServiceClient.findFirst({
        where: { organizationId: params.organizationId, inboundLeadId: value.inboundLeadId },
      })
    : await prisma.monthlyServiceClient.findFirst({
        where: { organizationId: params.organizationId, phone: value.phone, status: "ACTIVE" },
      });

  const data = {
    name: value.name,
    company: value.company,
    phone: value.phone,
    email: value.email,
    category: value.category,
    monthlyRatePaise: value.monthlyRatePaise,
    startedAt: value.startedAt,
    nextDueAt: value.nextDueAt,
    status: "ACTIVE" as MonthlyServiceClientStatus,
    assignedToId: value.assignedToId,
    workNote: value.workNote,
    notes: value.notes,
    inboundLeadId: value.inboundLeadId,
  };

  const client = existing
    ? await prisma.monthlyServiceClient.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.monthlyServiceClient.create({
        data: {
          organizationId: params.organizationId,
          createdByUserId: params.createdByUserId,
          ...data,
        },
      });

  if (value.inboundLeadId && lead) {
    const bumpStatus =
      lead.status !== "WON" &&
      lead.status !== "LOST" &&
      lead.status !== "PROJECT_ACTIVE"
        ? { status: "PROJECT_ACTIVE" as const }
        : {};
    await prisma.inboundLead.update({
      where: { id: value.inboundLeadId },
      data: {
        category: value.category,
        assignedToId: value.assignedToId,
        modifiedAt: new Date(),
        ...bumpStatus,
      },
    });
    await logInboundLeadActivity({
      organizationId: params.organizationId,
      leadId: value.inboundLeadId,
      type: "NOTE",
      body: `Added as monthly ${leadCategoryShortLabel(value.category)} client · ${formatInrPaise(value.monthlyRatePaise)} / month.`,
      createdByUserId: params.createdByUserId,
    });
  }

  return {
    ok: true as const,
    merged: Boolean(existing),
    monthlyRupees: paiseToRupees(client.monthlyRatePaise),
  };
}

export async function cancelMonthlyServiceClient(params: {
  organizationId: string;
  id: string;
}) {
  const existing = await prisma.monthlyServiceClient.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false as const, message: "Client not found." };
  }
  await prisma.monthlyServiceClient.update({
    where: { id: existing.id },
    data: { status: "CANCELLED" },
  });
  return { ok: true as const };
}
