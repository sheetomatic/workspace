import type { WhatsAppApiClient, WhatsAppApiPlanKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  daysUntilDue,
  formatBillingDate,
  isPastDueDate,
  startOfUtcDay,
} from "@/lib/billing/dates";
import { formatInrPaise, parseRupeesInput } from "@/lib/billing/money";
import type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
import {
  CUSTOM_WHATSAPP_API_PLAN_ID,
  expiryFromStart,
  nextExpiryAfterRecharge,
  resolveWhatsAppApiPlan,
} from "@/lib/billing/whatsapp-api-plans";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";

export type WhatsAppApiClientInput = {
  name: string;
  company?: string | null;
  phone: string;
  email?: string | null;
  planId: string;
  planKind?: WhatsAppApiPlanKind;
  customLabel?: string | null;
  customAmountRupees?: string | null;
  customDurationDays?: string | null;
  startedAt?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
};

export function parseWhatsAppApiClientInput(input: WhatsAppApiClientInput) {
  const name = input.name.trim();
  const company = input.company?.trim() || null;
  const phone = normalizeWhatsAppPhone(input.phone);
  const emailRaw = input.email?.trim().toLowerCase() || null;
  const notes = input.notes?.trim() || null;
  const startedRaw = input.startedAt?.trim();

  if (name.length < 2) {
    return { ok: false as const, message: "Enter the client name." };
  }
  if (!phone) {
    return { ok: false as const, message: "Enter a valid WhatsApp number." };
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return { ok: false as const, message: "Enter a valid email, or leave it blank." };
  }

  const catalog = resolveWhatsAppApiPlan(input.planId);
  let planKind: WhatsAppApiPlanKind;
  let planId: string;
  let planLabel: string;
  let amountPaise: number;
  let durationDays: number;

  if (catalog) {
    planKind = catalog.kind;
    planId = catalog.id;
    planLabel = catalog.label;
    amountPaise = catalog.amountPaise;
    durationDays = catalog.durationDays;
  } else if (input.planId === CUSTOM_WHATSAPP_API_PLAN_ID) {
    const amount = parseRupeesInput(input.customAmountRupees ?? "");
    const days = Number(input.customDurationDays ?? "");
    const label = input.customLabel?.trim() || "Custom WhatsApp API plan";
    if (amount === null || amount <= 0) {
      return { ok: false as const, message: "Enter the recharge amount." };
    }
    if (!Number.isFinite(days) || days < 1 || days > 1095) {
      return { ok: false as const, message: "Enter plan days between 1 and 1095." };
    }
    planKind = input.planKind === "OFFICIAL" ? "OFFICIAL" : "UNOFFICIAL";
    planId = CUSTOM_WHATSAPP_API_PLAN_ID;
    planLabel = label;
    amountPaise = amount;
    durationDays = Math.round(days);
  } else {
    return { ok: false as const, message: "Choose a WhatsApp API plan." };
  }

  const startedAt = startedRaw
    ? startOfUtcDay(new Date(`${startedRaw}T00:00:00.000Z`))
    : startOfUtcDay(new Date());
  if (Number.isNaN(startedAt.getTime())) {
    return { ok: false as const, message: "Enter a valid start date." };
  }

  return {
    ok: true as const,
    value: {
      name,
      company,
      phone,
      email: emailRaw,
      planKind,
      planId,
      planLabel,
      amountPaise,
      durationDays,
      startedAt,
      expiresAt: expiryFromStart(startedAt, durationDays),
      notes,
      createdByUserId: input.createdByUserId ?? null,
    },
  };
}

export async function upsertWhatsAppApiClient(input: WhatsAppApiClientInput) {
  const parsed = parseWhatsAppApiClientInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const row = await prisma.whatsAppApiClient.upsert({
    where: { phone: parsed.value.phone },
    create: {
      ...parsed.value,
      status: "ACTIVE",
      lastReminderAt: null,
      reminderCount: 0,
    },
    update: {
      name: parsed.value.name,
      company: parsed.value.company,
      email: parsed.value.email,
      planKind: parsed.value.planKind,
      planId: parsed.value.planId,
      planLabel: parsed.value.planLabel,
      amountPaise: parsed.value.amountPaise,
      durationDays: parsed.value.durationDays,
      startedAt: parsed.value.startedAt,
      expiresAt: parsed.value.expiresAt,
      status: "ACTIVE",
      notes: parsed.value.notes,
    },
  });

  return { ok: true as const, client: row };
}

export async function markWhatsAppApiClientRecharged(id: string, now = new Date()) {
  const existing = await prisma.whatsAppApiClient.findUnique({ where: { id } });
  if (!existing || existing.status === "CANCELLED") {
    return { ok: false as const, message: "WhatsApp API client not found." };
  }

  const expiresAt = nextExpiryAfterRecharge(
    existing.expiresAt,
    existing.durationDays,
    now,
  );
  const row = await prisma.whatsAppApiClient.update({
    where: { id },
    data: {
      startedAt: startOfUtcDay(now),
      expiresAt,
      status: "ACTIVE",
      lastReminderAt: null,
    },
  });
  return { ok: true as const, client: row };
}

export async function cancelWhatsAppApiClient(id: string) {
  const existing = await prisma.whatsAppApiClient.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false as const, message: "WhatsApp API client not found." };
  }
  await prisma.whatsAppApiClient.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return { ok: true as const };
}

export function toWhatsAppApiClientRow(
  client: WhatsAppApiClient,
  now = new Date(),
): WhatsAppApiClientRow {
  const daysLeft = daysUntilDue(client.expiresAt, now);
  const expired = isPastDueDate(client.expiresAt, now);
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    phone: client.phone,
    phoneLabel: formatWhatsAppPhone(client.phone),
    email: client.email,
    planKind: client.planKind,
    planKindLabel: client.planKind === "OFFICIAL" ? "Official API" : "Unofficial API",
    planId: client.planId,
    planLabel: client.planLabel,
    amountPaise: client.amountPaise,
    amountLabel: formatInrPaise(client.amountPaise),
    durationDays: client.durationDays,
    startedAt: client.startedAt,
    startedLabel: formatBillingDate(client.startedAt),
    expiresAt: client.expiresAt,
    expiresLabel: formatBillingDate(client.expiresAt),
    daysLeft,
    daysLeftLabel: expired
      ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`
      : daysLeft === 0
        ? "Expires today"
        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    status: expired && client.status === "ACTIVE" ? "EXPIRED" : client.status,
    reminderCount: client.reminderCount,
    notes: client.notes,
    dueSoon: !expired && daysLeft <= 7 && client.status !== "CANCELLED",
  };
}

export async function listWhatsAppApiClients(now = new Date()) {
  const rows = await prisma.whatsAppApiClient.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => toWhatsAppApiClientRow(row, now));
}

export type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
