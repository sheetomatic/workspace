import { Decimal } from "@prisma/client/runtime/library";
import type { OrgExpenseCategory, OrgExpenseRecurrence, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatInr } from "@/lib/leads/categories";
import { leadCapturedAtWhere, type LeadsPeriodRange } from "@/lib/leads/period";
import { ORG_EXPENSE_CATEGORY_LABELS } from "@/lib/my-space/expense-labels";

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
  options?: { category?: OrgExpenseCategory; from?: Date; to?: Date },
) {
  const where: Prisma.OrgExpenseEntryWhereInput = {
    organizationId,
    ...(options?.category ? { category: options.category } : {}),
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

export async function getMySpaceSnapshot(organizationId: string, period: LeadsPeriodRange) {
  const { start, end } = monthRange();
  const expenseWhere = {
    organizationId,
    expenseDate: { gte: start, lte: end },
  };

  const quotationDateFilter =
    period.type === "all"
      ? {}
      : { quotationDate: { gte: period.start, lte: period.end } };

  const [expenses, leadsCount, quotations, invoices, expenseRows, phonePlans] =
    await Promise.all([
      prisma.orgExpenseEntry.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.inboundLead.count({
        where: {
          organizationId,
          ...leadCapturedAtWhere(period),
        },
      }),
      prisma.inboundLeadQuotation.aggregate({
        where: {
          organizationId,
          requestType: "PROPOSAL",
          ...quotationDateFilter,
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.inboundLeadQuotation.aggregate({
        where: {
          organizationId,
          requestType: "INVOICE",
          ...quotationDateFilter,
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.orgExpenseEntry.groupBy({
        by: ["category"],
        where: expenseWhere,
        _sum: { amount: true },
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

  const byCategory = expenseRows
    .map((row) => ({
      category: row.category,
      label: ORG_EXPENSE_CATEGORY_LABELS[row.category],
      count: row._count._all,
      amount: Number(row._sum.amount ?? 0),
      amountLabel: formatInr(Number(row._sum.amount ?? 0)),
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenseTotal = Number(expenses._sum.amount ?? 0);
  const quotationTotal = Number(quotations._sum.totalAmount ?? 0);
  const invoiceTotal = Number(invoices._sum.totalAmount ?? 0);

  return {
    monthLabel: start.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    expenseTotal,
    expenseTotalLabel: formatInr(expenseTotal),
    expenseCount: expenses._count._all,
    leadsCount,
    quotationCount: quotations._count._all,
    quotationTotal,
    quotationTotalLabel: formatInr(quotationTotal),
    invoiceCount: invoices._count._all,
    invoiceTotal,
    invoiceTotalLabel: formatInr(invoiceTotal),
    activePhoneNumbers: phonePlans._sum.quantity ?? 0,
    phonePlanCostLabel: formatInr(Number(phonePlans._sum.amount ?? 0)),
    byCategory,
  };
}
