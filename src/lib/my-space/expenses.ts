import { Decimal } from "@prisma/client/runtime/library";
import type { OrgExpenseCategory, OrgExpenseRecurrence, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatInr, leadCategoryLabel } from "@/lib/leads/categories";
import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";
import { leadCapturedAtWhere, type LeadsPeriodRange } from "@/lib/leads/period";
import {
  LEAD_PAYMENT_TYPE_LABELS,
  ORG_EXPENSE_CATEGORY_LABELS,
} from "@/lib/my-space/expense-labels";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function listOrgExpenses(
  organizationId: string,
  options?: {
    category?: OrgExpenseCategory;
    from?: Date;
    to?: Date;
    recurrence?: OrgExpenseRecurrence;
  },
) {
  const where: Prisma.OrgExpenseEntryWhereInput = {
    organizationId,
    ...(options?.category ? { category: options.category } : {}),
    ...(options?.recurrence ? { recurrence: options.recurrence } : {}),
    ...(options?.from || options?.to
      ? {
          expenseDate: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  };

  return prisma.orgExpenseEntry.findMany({
    where,
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
    },
    take: 200,
  });
}

export async function createOrgExpense(params: {
  organizationId: string;
  createdById: string;
  category: OrgExpenseCategory;
  title: string;
  amount: number;
  expenseDate: Date;
  recurrence?: OrgExpenseRecurrence;
  quantity?: number | null;
  assetLabel?: string;
  vendor?: string;
  notes?: string;
}) {
  const title = params.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  if (!Number.isFinite(params.amount) || params.amount < 0) {
    throw new Error("Enter a valid amount.");
  }
  if (params.category === "EMI" && !params.assetLabel?.trim()) {
    throw new Error("Enter the EMI asset (e.g. car, home, laptop).");
  }
  if (params.category === "PHONE_NUMBERS_PLAN") {
    if (params.quantity == null || !Number.isFinite(params.quantity) || params.quantity < 1) {
      throw new Error("Enter number of active numbers on the plan.");
    }
  }

  return prisma.orgExpenseEntry.create({
    data: {
      organizationId: params.organizationId,
      createdById: params.createdById,
      category: params.category,
      title,
      amount: dec(params.amount),
      expenseDate: params.expenseDate,
      recurrence: params.recurrence ?? "ONE_TIME",
      quantity: params.quantity ?? null,
      assetLabel: params.assetLabel?.trim() || null,
      vendor: params.vendor?.trim() || null,
      notes: params.notes?.trim() || null,
    },
  });
}

export async function deleteOrgExpense(organizationId: string, expenseId: string) {
  const existing = await prisma.orgExpenseEntry.findFirst({
    where: { id: expenseId, organizationId },
  });
  if (!existing) {
    throw new Error("Expense not found.");
  }
  await prisma.orgExpenseEntry.delete({ where: { id: existing.id } });
}

function expenseDateFilter(period: LeadsPeriodRange) {
  if (period.type === "all") {
    return {};
  }
  return { expenseDate: { gte: period.start, lte: period.end } };
}

function paymentDateFilter(period: LeadsPeriodRange) {
  if (period.type === "all") {
    return {};
  }
  return { receivedDate: { gte: period.start, lte: period.end } };
}

function quotationDateFilter(period: LeadsPeriodRange) {
  if (period.type === "all") {
    return {};
  }
  return { quotationDate: { gte: period.start, lte: period.end } };
}

export async function getMySpaceSnapshot(organizationId: string, period: LeadsPeriodRange) {
  const expenseWhere = {
    organizationId,
    ...expenseDateFilter(period),
  };

  const [
    expenses,
    fixedExpenses,
    expenseRows,
    payments,
    paymentRows,
    leadsCount,
    leadSourceRows,
    proposals,
    invoices,
    phonePlans,
  ] = await Promise.all([
    prisma.orgExpenseEntry.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.orgExpenseEntry.aggregate({
      where: {
        ...expenseWhere,
        recurrence: "MONTHLY",
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.orgExpenseEntry.groupBy({
      by: ["category"],
      where: expenseWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.inboundLeadPayment.aggregate({
      where: {
        organizationId,
        ...paymentDateFilter(period),
      },
      _sum: { receivedAmount: true },
      _count: { _all: true },
    }),
    prisma.inboundLeadPayment.groupBy({
      by: ["paymentType"],
      where: {
        organizationId,
        ...paymentDateFilter(period),
      },
      _sum: { receivedAmount: true },
      _count: { _all: true },
    }),
    prisma.inboundLead.count({
      where: {
        organizationId,
        ...leadCapturedAtWhere(period),
      },
    }),
    prisma.inboundLead.groupBy({
      by: ["channel"],
      where: {
        organizationId,
        ...leadCapturedAtWhere(period),
      },
      _count: { _all: true },
    }),
    prisma.inboundLeadQuotation.aggregate({
      where: {
        organizationId,
        requestType: "PROPOSAL",
        ...quotationDateFilter(period),
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.inboundLeadQuotation.aggregate({
      where: {
        organizationId,
        requestType: "INVOICE",
        ...quotationDateFilter(period),
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.orgExpenseEntry.aggregate({
      where: {
        ...expenseWhere,
        category: "PHONE_NUMBERS_PLAN",
      },
      _sum: { quantity: true, amount: true },
    }),
  ]);

  const expenseIncurredByCategory = expenseRows
    .map((row) => ({
      key: row.category,
      label: ORG_EXPENSE_CATEGORY_LABELS[row.category],
      count: row._count._all,
      amount: Number(row._sum.amount ?? 0),
      amountLabel: formatInr(Number(row._sum.amount ?? 0)),
    }))
    .sort((a, b) => b.amount - a.amount);

  const paymentReceivedByCategory = paymentRows
    .map((row) => ({
      key: row.paymentType,
      label: LEAD_PAYMENT_TYPE_LABELS[row.paymentType] ?? row.paymentType,
      count: row._count._all,
      amount: Number(row._sum.receivedAmount ?? 0),
      amountLabel: formatInr(Number(row._sum.receivedAmount ?? 0)),
    }))
    .sort((a, b) => b.amount - a.amount);

  const leadsBySource = leadSourceRows
    .map((row) => ({
      key: row.channel,
      label: LEAD_CHANNEL_LABELS[row.channel] ?? row.channel,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const expenseIncurred = Number(expenses._sum.amount ?? 0);
  const fixedExpenseTotal = Number(fixedExpenses._sum.amount ?? 0);
  const paymentReceived = Number(payments._sum.receivedAmount ?? 0);
  const proposalValue = Number(proposals._sum.totalAmount ?? 0);
  const invoicedValue = Number(invoices._sum.totalAmount ?? 0);

  const periodTitle =
    period.type === "all"
      ? "All Time"
      : period.periodLabel ||
        monthRange().start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return {
    periodTitle,
    isAllTime: period.type === "all",
    expenseIncurred,
    expenseIncurredLabel: formatInr(expenseIncurred),
    expenseCount: expenses._count._all,
    fixedExpenseTotal,
    fixedExpenseTotalLabel: formatInr(fixedExpenseTotal),
    fixedExpenseCount: fixedExpenses._count._all,
    paymentReceived,
    paymentReceivedLabel: formatInr(paymentReceived),
    paymentCount: payments._count._all,
    totalLeads: leadsCount,
    invoicedValue,
    invoicedValueLabel: formatInr(invoicedValue),
    invoiceCount: invoices._count._all,
    proposalValue,
    proposalValueLabel: formatInr(proposalValue),
    proposalCount: proposals._count._all,
    activePhoneNumbers: phonePlans._sum.quantity ?? 0,
    phonePlanCostLabel: formatInr(Number(phonePlans._sum.amount ?? 0)),
    expenseIncurredByCategory,
    paymentReceivedByCategory,
    leadsBySource,
    byCategory: expenseIncurredByCategory,
    expenseTotalLabel: formatInr(expenseIncurred),
    leadsCount,
  };
}

/** Also expose lead category helper for future payment-by-lead-category views. */
export function paymentCategoryLabel(categoryId: string | null | undefined) {
  return leadCategoryLabel(categoryId);
}
