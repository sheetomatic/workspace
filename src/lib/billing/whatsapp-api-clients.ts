import type {
  WhatsAppApiAccountGroup,
  WhatsAppApiClient,
  WhatsAppApiClientStatus,
  WhatsAppApiPlanKind,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addUtcDays,
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
import {
  addMasResellerCredits,
  listMasResellerCustomers,
  updateMasResellerValidity,
} from "@/lib/integrations/mas-reseller";

export type WhatsAppApiClientInput = {
  externalId?: string | null;
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
  expiresAt?: string | null;
  notes?: string | null;
  creditPoints?: number | null;
  accountGroup?: WhatsAppApiAccountGroup;
  allowZeroAmount?: boolean;
  createdByUserId?: string | null;
};

/** Stored and typed phones that should count as the same WhatsApp number. */
export function whatsAppApiPhoneKeys(phone: string) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return [];
  const last10 = normalized.slice(-10);
  return [...new Set([normalized, last10, `91${last10}`])];
}

export function mergeWhatsAppApiNotes(
  existing: string | null | undefined,
  incoming: string | null | undefined,
) {
  const prev = existing?.trim() || "";
  const next = incoming?.trim() || "";
  if (!next) return prev || null;
  if (!prev) return next;
  if (prev.includes(next)) return prev;
  if (next.includes(prev)) return next;
  return `${prev} · ${next}`;
}

export async function findWhatsAppApiClientMatch(params: {
  phone: string;
  externalId?: string | null;
}) {
  const phones = whatsAppApiPhoneKeys(params.phone);
  if (phones.length) {
    const regular = await prisma.whatsAppApiClient.findFirst({
      where: { phone: { in: phones }, accountGroup: "REGULAR" },
      orderBy: { createdAt: "asc" },
    });
    if (regular) return regular;
    const byPhone = await prisma.whatsAppApiClient.findFirst({
      where: { phone: { in: phones } },
      orderBy: { createdAt: "asc" },
    });
    if (byPhone) return byPhone;
  }

  const externalId = params.externalId?.trim();
  if (!externalId) return null;
  return prisma.whatsAppApiClient.findUnique({
    where: { externalId },
  });
}

export function parseWhatsAppApiClientInput(input: WhatsAppApiClientInput) {
  const name = input.name.trim();
  const company = input.company?.trim() || null;
  const phone = normalizeWhatsAppPhone(input.phone);
  const emailRaw = input.email?.trim().toLowerCase() || null;
  const notes = input.notes?.trim() || null;
  const startedRaw = input.startedAt?.trim();
  const expiresRaw = input.expiresAt?.trim();

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
    if (amount === null || amount < 0 || (amount === 0 && !input.allowZeroAmount)) {
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

  const expiresAt = expiresRaw
    ? startOfUtcDay(new Date(`${expiresRaw}T00:00:00.000Z`))
    : null;
  if (expiresRaw && (!expiresAt || Number.isNaN(expiresAt.getTime()))) {
    return { ok: false as const, message: "Enter a valid expiry date." };
  }

  const startedAt = startedRaw
    ? startOfUtcDay(new Date(`${startedRaw}T00:00:00.000Z`))
    : expiresAt
      ? addUtcDays(expiresAt, -durationDays)
      : startOfUtcDay(new Date());
  if (Number.isNaN(startedAt.getTime())) {
    return { ok: false as const, message: "Enter a valid start date." };
  }

  const accountGroup: WhatsAppApiAccountGroup =
    input.accountGroup === "INACTIVE" ? "INACTIVE" : "REGULAR";
  const status: WhatsAppApiClientStatus =
    accountGroup === "INACTIVE" ? "CANCELLED" : "ACTIVE";

  return {
    ok: true as const,
    value: {
      externalId: input.externalId?.trim() || null,
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
      expiresAt: expiresAt ?? expiryFromStart(startedAt, durationDays),
      notes,
      creditPoints:
        typeof input.creditPoints === "number" && Number.isFinite(input.creditPoints)
          ? Math.max(0, Math.round(input.creditPoints))
          : null,
      accountGroup,
      status,
      createdByUserId: input.createdByUserId ?? null,
    },
  };
}

export async function upsertWhatsAppApiClient(input: WhatsAppApiClientInput) {
  const parsed = parseWhatsAppApiClientInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const existing = await findWhatsAppApiClientMatch({
    phone: parsed.value.phone,
    externalId: parsed.value.externalId,
  });

  let externalId = existing?.externalId ?? parsed.value.externalId;
  if (parsed.value.externalId) {
    if (!existing?.externalId || existing.externalId === parsed.value.externalId) {
      externalId = parsed.value.externalId;
    } else {
      const taken = await prisma.whatsAppApiClient.findUnique({
        where: { externalId: parsed.value.externalId },
        select: { id: true },
      });
      if (!taken || taken.id === existing.id) {
        externalId = parsed.value.externalId;
      }
    }
  }

  const data = {
    externalId,
    name: parsed.value.name,
    company: parsed.value.company ?? existing?.company ?? null,
    phone: parsed.value.phone,
    email: parsed.value.email ?? existing?.email ?? null,
    planKind: parsed.value.planKind,
    planId: parsed.value.planId,
    planLabel: parsed.value.planLabel,
    amountPaise: parsed.value.amountPaise,
    durationDays: parsed.value.durationDays,
    startedAt: parsed.value.startedAt,
    expiresAt: parsed.value.expiresAt,
    status: parsed.value.status,
    accountGroup: parsed.value.accountGroup,
    notes: mergeWhatsAppApiNotes(existing?.notes, parsed.value.notes),
    ...(parsed.value.creditPoints != null ? { creditPoints: parsed.value.creditPoints } : {}),
  };

  const row = existing
    ? await prisma.whatsAppApiClient.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.whatsAppApiClient.create({
        data: {
          ...data,
          lastReminderAt: null,
          reminderCount: 0,
          createdByUserId: parsed.value.createdByUserId,
        },
      });

  return { ok: true as const, client: row, merged: Boolean(existing) };
}

export async function markWhatsAppApiClientRecharged(id: string, now = new Date()) {
  const existing = await prisma.whatsAppApiClient.findUnique({ where: { id } });
  if (!existing) {
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
      accountGroup: "REGULAR",
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
    data: { status: "CANCELLED", accountGroup: "INACTIVE" },
  });
  return { ok: true as const };
}

export function toWhatsAppApiClientRow(
  client: WhatsAppApiClient,
  now = new Date(),
): WhatsAppApiClientRow {
  const daysLeft = daysUntilDue(client.expiresAt, now);
  const expired = isPastDueDate(client.expiresAt, now);
  const accountGroup = client.accountGroup;
  const displayStatus =
    accountGroup === "INACTIVE"
      ? "INACTIVE"
      : expired && client.status !== "CANCELLED"
        ? "EXPIRED"
        : client.status;

  return {
    id: client.id,
    externalId: client.externalId,
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
    amountLabel: client.amountPaise > 0 ? formatInrPaise(client.amountPaise) : "—",
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
    status: displayStatus,
    accountGroup,
    creditPoints: client.creditPoints,
    reminderCount: client.reminderCount,
    notes: client.notes,
    dueSoon:
      accountGroup === "REGULAR" &&
      !expired &&
      daysLeft <= 10 &&
      client.status !== "CANCELLED",
  };
}

export async function listWhatsAppApiClients(now = new Date()) {
  const rows = await prisma.whatsAppApiClient.findMany({
    orderBy: [{ accountGroup: "desc" }, { expiresAt: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => toWhatsAppApiClientRow(row, now));
}

export async function syncWhatsAppApiClientsFromPanel(createdByUserId?: string | null) {
  const listed = await listMasResellerCustomers();
  if (!listed.ok) return listed;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const customer of listed.customers) {
    if (!customer.phone) {
      skipped += 1;
      continue;
    }
    const result = await upsertWhatsAppApiClient({
      externalId: customer.externalId,
      name: customer.username,
      phone: customer.phone,
      email: customer.email,
      planId: CUSTOM_WHATSAPP_API_PLAN_ID,
      planKind: "UNOFFICIAL",
      customLabel: "WhatsApp API panel",
      customAmountRupees: "0",
      customDurationDays: "365",
      expiresAt: customer.expiresAt,
      creditPoints: customer.creditPoints,
      notes: customer.externalId ? `Panel #${customer.externalId}` : null,
      accountGroup: customer.accountGroup,
      allowZeroAmount: true,
      createdByUserId,
    });
    if (!result.ok) {
      skipped += 1;
      continue;
    }
    if (result.merged) updated += 1;
    else created += 1;
  }

  return {
    ok: true as const,
    created,
    updated,
    skipped,
    total: listed.customers.length,
    message: `Synced ${created} new and ${updated} existing clients from the panel.${
      skipped ? ` ${skipped} skipped (no valid number).` : ""
    }`,
  };
}

export async function applyWhatsAppApiClientCustomPlan(
  id: string,
  input: { days?: number; credits?: number },
) {
  const existing = await prisma.whatsAppApiClient.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, message: "WhatsApp API client not found." };
  }

  const days =
    typeof input.days === "number" && Number.isFinite(input.days) && input.days >= 1
      ? Math.min(1095, Math.round(input.days))
      : 0;
  const credits =
    typeof input.credits === "number" && Number.isFinite(input.credits) && input.credits >= 1
      ? Math.min(1_000_000, Math.round(input.credits))
      : 0;
  if (!days && !credits) {
    return { ok: false as const, message: "Enter days, credits, or both." };
  }

  const panelNotes: string[] = [];
  let expiresAt = existing.expiresAt;
  let creditPoints = existing.creditPoints;

  if (days) {
    expiresAt = nextExpiryAfterRecharge(existing.expiresAt, days, new Date());
    const panel = await updateMasResellerValidity({
      username: existing.name,
      externalId: existing.externalId,
      validUpto: `${expiresAt.toISOString().slice(0, 10)} 23:59:59`,
    });
    panelNotes.push(
      panel.ok ? `Panel expiry updated.` : `Panel recharge skipped (${panel.error}).`,
    );
  }
  if (credits) {
    creditPoints = existing.creditPoints + credits;
    const panel = await addMasResellerCredits({
      username: existing.name,
      externalId: existing.externalId,
      credits,
    });
    panelNotes.push(
      panel.ok ? `Panel credits added.` : `Panel credits skipped (${panel.error}).`,
    );
  }

  const row = await prisma.whatsAppApiClient.update({
    where: { id },
    data: {
      ...(days
        ? {
            startedAt: startOfUtcDay(new Date()),
            expiresAt,
            durationDays: days,
            status: "ACTIVE" as const,
            accountGroup: "REGULAR" as const,
            lastReminderAt: null,
          }
        : {}),
      ...(credits ? { creditPoints } : {}),
    },
  });

  const localBits = [
    days ? `${days} days` : null,
    credits ? `${credits.toLocaleString("en-IN")} credits` : null,
  ].filter(Boolean);

  return {
    ok: true as const,
    client: row,
    message: `Saved ${localBits.join(" + ")} on this board. ${panelNotes.join(" ")}`,
  };
}

export async function addWhatsAppApiClientPanelCredits(id: string, credits: number) {
  const existing = await prisma.whatsAppApiClient.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, message: "WhatsApp API client not found." };
  }
  const panel = await addMasResellerCredits({
    username: existing.name,
    externalId: existing.externalId,
    credits,
  });
  if (!panel.ok) {
    return { ok: false as const, message: panel.error };
  }
  const row = await prisma.whatsAppApiClient.update({
    where: { id },
    data: { creditPoints: existing.creditPoints + Math.round(credits) },
  });
  return { ok: true as const, client: row, message: panel.message };
}

export async function rechargeWhatsAppApiClientOnPanel(id: string, days: number) {
  const existing = await prisma.whatsAppApiClient.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, message: "WhatsApp API client not found." };
  }
  const duration = Number.isFinite(days) && days >= 1 && days <= 1095 ? Math.round(days) : existing.durationDays;
  const expiresAt = nextExpiryAfterRecharge(existing.expiresAt, duration, new Date());
  const validUpto = `${expiresAt.toISOString().slice(0, 10)} 23:59:59`;
  const panel = await updateMasResellerValidity({
    username: existing.name,
    externalId: existing.externalId,
    validUpto,
  });
  if (!panel.ok) {
    return { ok: false as const, message: panel.error };
  }
  const row = await prisma.whatsAppApiClient.update({
    where: { id },
    data: {
      startedAt: startOfUtcDay(new Date()),
      expiresAt,
      durationDays: duration,
      status: "ACTIVE",
      accountGroup: "REGULAR",
      lastReminderAt: null,
    },
  });
  return { ok: true as const, client: row, message: panel.message };
}

export type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
