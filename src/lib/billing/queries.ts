import { prisma } from "@/lib/db";
import {
  catalogRateForWorkspace,
  resolveSoldProduct,
  SOLD_PRODUCT_LABELS,
} from "@/lib/billing/catalog";
import { onboardingProgress } from "@/lib/billing/checklist";
import { formatBillingDate } from "@/lib/billing/dates";
import { formatInrPaise } from "@/lib/billing/money";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";

export async function listClientBillingRows() {
  const orgs = await prisma.organization.findMany({
    where: { isPrimary: false, slug: { not: PRIMARY_ORG_SLUG } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      product: true,
      allowedModules: true,
      planStatus: true,
      maxMembers: true,
      billing: true,
      organizationPlan: { select: { renewalAt: true, status: true } },
      memberships: {
        where: { deactivatedAt: null },
        select: {
          role: true,
          user: { select: { name: true, email: true } },
        },
      },
      subscriptionInvoices: {
        where: { status: { not: "VOID" } },
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          totalPaise: true,
          paidPaise: true,
          dueAt: true,
        },
      },
      onboardingTasks: {
        select: { completedAt: true },
      },
    },
  });

  return orgs.map((org) => {
    const catalog = catalogRateForWorkspace(org);
    const product = resolveSoldProduct(org);
    const billing = org.billing;
    const invoices = org.subscriptionInvoices;
    const latest = invoices[0] ?? null;
    const invoicedPaise = invoices.reduce((sum, row) => sum + row.totalPaise, 0);
    const receivedPaise = invoices.reduce((sum, row) => sum + row.paidPaise, 0);
    const pendingPaise = invoices
      .filter((row) => row.status === "DRAFT" || row.status === "SENT" || row.status === "OVERDUE")
      .reduce((sum, row) => sum + Math.max(0, row.totalPaise - row.paidPaise), 0);
    const pendingInvoices = invoices.filter(
      (row) => row.status === "DRAFT" || row.status === "SENT" || row.status === "OVERDUE",
    ).length;
    const owner = org.memberships.find((row) => row.role === "OWNER") ?? org.memberships[0];
    const progress = onboardingProgress(org.onboardingTasks);
    const monthly = billing?.monthlyRatePaise ?? catalog.monthlyRatePaise;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      plan: org.plan,
      product,
      productLabel: SOLD_PRODUCT_LABELS[product],
      planLabel: ORG_PLAN_LABELS[org.plan] ?? org.plan,
      planStatus: org.organizationPlan?.status ?? org.planStatus,
      activeUsers: org.memberships.length,
      maxMembers: org.maxMembers,
      monthlyLabel: formatInrPaise(monthly),
      monthlyPaise: monthly,
      renewalAt: org.organizationPlan?.renewalAt ?? latest?.dueAt ?? null,
      renewalLabel: org.organizationPlan?.renewalAt
        ? formatBillingDate(org.organizationPlan.renewalAt)
        : latest
          ? formatBillingDate(latest.dueAt)
          : "—",
      ownerName: owner?.user.name ?? null,
      ownerEmail: owner?.user.email ?? null,
      latestInvoice: latest
        ? {
            id: latest.id,
            number: latest.number,
            status: latest.status,
            totalLabel: formatInrPaise(latest.totalPaise),
            dueLabel: formatBillingDate(latest.dueAt),
          }
        : null,
      invoicedPaise,
      receivedPaise,
      pendingPaise,
      pendingInvoices,
      invoicedLabel: formatInrPaise(invoicedPaise),
      receivedLabel: formatInrPaise(receivedPaise),
      pendingLabel: formatInrPaise(pendingPaise),
      onboarding: progress,
    };
  });
}

export type ClientBillingRow = Awaited<ReturnType<typeof listClientBillingRows>>[number];

export function summarizeClientBilling(rows: ClientBillingRow[]) {
  return {
    clients: rows.length,
    activeUsers: rows.reduce((sum, row) => sum + row.activeUsers, 0),
    invoicedPaise: rows.reduce((sum, row) => sum + row.invoicedPaise, 0),
    pendingPaise: rows.reduce((sum, row) => sum + row.pendingPaise, 0),
    receivedPaise: rows.reduce((sum, row) => sum + row.receivedPaise, 0),
    pendingInvoices: rows.reduce((sum, row) => sum + row.pendingInvoices, 0),
    onHold: rows.filter(
      (row) => row.status === "HOLD" || row.planStatus === "PAST_DUE",
    ).length,
  };
}

export async function getClientBillingDetail(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      product: true,
      planStatus: true,
      billingPeriod: true,
      allowedModules: true,
      maxMembers: true,
      isPrimary: true,
      billing: true,
      organizationPlan: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
      },
      subscriptionInvoices: {
        orderBy: { issuedAt: "desc" },
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
      onboardingTasks: { orderBy: { sortOrder: "asc" } },
    },
  });
  return org;
}

export async function getWorkspaceBillingSnapshot(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      product: true,
      allowedModules: true,
      planStatus: true,
      billingPeriod: true,
      maxMembers: true,
      isPrimary: true,
      billing: true,
      organizationPlan: true,
      memberships: { select: { id: true } },
      subscriptionInvoices: {
        where: { status: { not: "VOID" } },
        orderBy: { issuedAt: "desc" },
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
    },
  });
}
