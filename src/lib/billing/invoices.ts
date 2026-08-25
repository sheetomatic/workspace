import type { OrgPlan, Prisma, WorkspaceModule, WorkspaceProduct } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  catalogRateForWorkspace,
  extraAddonMonthlyPaise,
  workspaceAddonCharges,
} from "@/lib/billing/catalog";
import { CLIENT_ONBOARDING_TASKS } from "@/lib/billing/checklist";
import { addUtcDays, monthlyPeriodFrom, startOfUtcDay } from "@/lib/billing/dates";
import { buildInvoiceQuote, type InvoiceLineItem } from "@/lib/billing/prorata";
import { syncOrganizationPlanRecord } from "@/lib/organization-plan";

export type BillingProfile = {
  monthlyRatePaise: number;
  extraUserMonthlyPaise: number;
  includedUsers: number;
  gstPercent: number;
  billingEmail: string | null;
  billingName: string | null;
  gstin: string | null;
  notes: string | null;
};

export async function ensureOnboardingTasks(organizationId: string) {
  const existing = await prisma.clientOnboardingTask.findMany({
    where: { organizationId },
    select: { key: true },
  });
  const have = new Set(existing.map((row) => row.key));
  const missing = CLIENT_ONBOARDING_TASKS.filter((task) => !have.has(task.key));
  if (missing.length === 0) return;

  await prisma.clientOnboardingTask.createMany({
    data: missing.map((task) => ({
      organizationId,
      key: task.key,
      label: task.label,
      sortOrder: task.sortOrder,
    })),
    skipDuplicates: true,
  });
}

export async function markOnboardingTask(
  organizationId: string,
  key: string,
  completed: boolean,
  userId?: string | null,
) {
  await ensureOnboardingTasks(organizationId);
  await prisma.clientOnboardingTask.update({
    where: { organizationId_key: { organizationId, key } },
    data: completed
      ? { completedAt: new Date(), completedByUserId: userId ?? null }
      : { completedAt: null, completedByUserId: null },
  });
}

export async function ensureOrganizationBilling(
  organization: {
    id: string;
    plan: OrgPlan;
    product?: WorkspaceProduct | null;
    allowedModules: WorkspaceModule[];
  },
) {
  const existing = await prisma.organizationBilling.findUnique({
    where: { organizationId: organization.id },
  });
  if (existing) return existing;

  const catalog = catalogRateForWorkspace(organization);
  return prisma.organizationBilling.create({
    data: {
      organizationId: organization.id,
      monthlyRatePaise: catalog.monthlyRatePaise,
      extraUserMonthlyPaise: catalog.extraUserMonthlyPaise,
      includedUsers: catalog.includedUsers,
      gstPercent: catalog.gstPercent,
    },
  });
}

async function nextInvoiceNumber() {
  const year = new Date().getUTCFullYear();
  const prefix = `SM-${year}-`;
  const last = await prisma.subscriptionInvoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const next = last
    ? Number.parseInt(last.number.slice(prefix.length), 10) + 1
    : 1;
  if (!Number.isFinite(next) || next < 1) {
    return `${prefix}0001`;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function countActiveUsers(organizationId: string) {
  return prisma.membership.count({ where: { organizationId } });
}

export function quoteForOrganization(input: {
  plan: OrgPlan;
  product?: WorkspaceProduct | null;
  allowedModules: WorkspaceModule[];
  billing: BillingProfile;
  activeUsers: number;
  periodStart: Date;
  periodEnd: Date;
  prorate: boolean;
  asOf?: Date;
}) {
  return buildInvoiceQuote({
    monthlyRatePaise: input.billing.monthlyRatePaise,
    extraUserMonthlyPaise: input.billing.extraUserMonthlyPaise,
    includedUsers: input.billing.includedUsers,
    activeUsers: input.activeUsers,
    extraAddonPaise: extraAddonMonthlyPaise(
      input.allowedModules,
      input.plan,
      input.product,
    ),
    extraAddonLines: workspaceAddonCharges(
      input.allowedModules,
      input.plan,
      input.product,
    ).map((row) => ({ label: row.label, amountPaise: row.amountPaise })),
    gstPercent: input.billing.gstPercent,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    asOf: input.asOf,
    prorate: input.prorate,
  });
}

export async function generateSubscriptionInvoice(input: {
  organizationId: string;
  prorate?: boolean;
  asOf?: Date;
  notes?: string | null;
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      id: true,
      plan: true,
      product: true,
      allowedModules: true,
      billingPeriod: true,
      organizationPlan: { select: { renewalAt: true, billingPeriod: true } },
    },
  });
  if (!organization) {
    return { ok: false as const, message: "Workspace not found." };
  }

  const open = await prisma.subscriptionInvoice.findFirst({
    where: {
      organizationId: organization.id,
      status: { in: ["DRAFT", "SENT", "OVERDUE"] },
    },
    select: { number: true },
  });
  if (open) {
    return {
      ok: false as const,
      message: `Invoice ${open.number} is still open. Collect or void it before generating another.`,
    };
  }

  const billing = await ensureOrganizationBilling(organization);
  const activeUsers = await countActiveUsers(organization.id);
  const asOf = startOfUtcDay(input.asOf ?? new Date());
  const lastPaid = await prisma.subscriptionInvoice.findFirst({
    where: { organizationId: organization.id, status: "PAID" },
    orderBy: { periodEnd: "desc" },
    select: { periodEnd: true },
  });
  const renewalAt = organization.organizationPlan?.renewalAt ?? lastPaid?.periodEnd ?? null;
  const prorate = Boolean(input.prorate);
  const inPaidPeriod =
    Boolean(lastPaid && renewalAt && asOf.getTime() <= renewalAt.getTime());
  const periodStart =
    prorate && inPaidPeriod
      ? asOf
      : lastPaid
        ? addUtcDays(lastPaid.periodEnd, 1)
        : asOf;
  const monthEnd = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0),
  );
  const fullPeriod = monthlyPeriodFrom(periodStart);
  const periodEnd =
    prorate && inPaidPeriod && renewalAt
      ? renewalAt
      : prorate && !lastPaid
        ? monthEnd
        : fullPeriod.periodEnd;
  const dueAt = periodEnd;
  const quote = quoteForOrganization({
    plan: organization.plan,
    product: organization.product,
    allowedModules: organization.allowedModules,
    billing,
    activeUsers,
    periodStart,
    periodEnd,
    prorate,
    asOf,
  });

  if (quote.totalPaise <= 0) {
    return {
      ok: false as const,
      message: "Set a monthly rate before generating an invoice.",
    };
  }

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      organizationId: organization.id,
      number: await nextInvoiceNumber(),
      status: "DRAFT",
      kind: quote.kind,
      periodStart,
      periodEnd,
      dueAt,
      subtotalPaise: quote.subtotalPaise,
      extraPaise: quote.extraPaise,
      gstPaise: quote.gstPaise,
      totalPaise: quote.totalPaise,
      lineItems: quote.lineItems as Prisma.InputJsonValue,
      notes: input.notes ?? null,
    },
  });

  await syncOrganizationPlanRecord(organization.id, {
    renewalAt: dueAt,
    billingPeriod:
      organization.organizationPlan?.billingPeriod ??
      organization.billingPeriod,
  });
  await markOnboardingTask(organization.id, "first_invoice", true);

  return { ok: true as const, invoice };
}

export type RecordPaymentInput = {
  invoiceId: string;
  organizationId: string;
  amountPaise: number;
  method: "UPI" | "BANK" | "CASH" | "OTHER";
  reference?: string | null;
  notes?: string | null;
  recordedByUserId?: string | null;
  paidAt?: Date;
};

export async function recordSubscriptionPayment(input: RecordPaymentInput) {
  if (input.amountPaise <= 0) {
    return { ok: false as const, message: "Enter a payment amount." };
  }

  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: { id: input.invoiceId, organizationId: input.organizationId },
  });
  if (!invoice || invoice.status === "VOID") {
    return { ok: false as const, message: "Invoice not found." };
  }

  const paidAt = input.paidAt ?? new Date();
  const nextPaid = invoice.paidPaise + input.amountPaise;
  const fullyPaid = nextPaid >= invoice.totalPaise;

  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.create({
      data: {
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        amountPaise: input.amountPaise,
        method: input.method,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        recordedByUserId: input.recordedByUserId ?? null,
        paidAt,
      },
    });

    await tx.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        paidPaise: nextPaid,
        status: fullyPaid ? "PAID" : invoice.status === "DRAFT" ? "SENT" : invoice.status,
        paidAt: fullyPaid ? paidAt : invoice.paidAt,
      },
    });

    if (fullyPaid) {
      await tx.organization.update({
        where: { id: invoice.organizationId },
        data: {
          status: "ACTIVE",
          planStatus: "ACTIVE",
        },
      });
    }
  });

  if (fullyPaid) {
    await syncOrganizationPlanRecord(invoice.organizationId, {
      status: "ACTIVE",
      renewalAt: invoice.dueAt,
    });
    await markOnboardingTask(
      invoice.organizationId,
      "first_payment",
      true,
      input.recordedByUserId,
    );
  }

  return { ok: true as const, fullyPaid };
}

export async function voidSubscriptionInvoice(
  organizationId: string,
  invoiceId: string,
) {
  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: { id: invoiceId, organizationId },
  });
  if (!invoice) {
    return { ok: false as const, message: "Invoice not found." };
  }
  if (invoice.status === "PAID") {
    return { ok: false as const, message: "Paid invoices cannot be voided." };
  }
  await prisma.subscriptionInvoice.update({
    where: { id: invoice.id },
    data: { status: "VOID" },
  });
  return { ok: true as const };
}

export function invoiceLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is InvoiceLineItem => {
    return Boolean(
      row &&
        typeof row === "object" &&
        "label" in row &&
        "amountPaise" in row,
    );
  });
}
