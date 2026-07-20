import "server-only";

import { prisma } from "@/lib/db";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { getSalesOrderStats } from "@/lib/sales-orders/queries";

export type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";

/** Lightweight counts for CRM sub-module nav badges. */
export async function getCrmModuleNavCounts(
  organizationId: string,
): Promise<CrmModuleNavCounts> {
  const now = new Date();
  const [
    leads,
    meetings,
    quotationAgg,
    paymentAgg,
    soStats,
    training,
  ] = await Promise.all([
    prisma.inboundLead.count({
      where: {
        organizationId,
        archivedAt: null,
        mergedIntoId: null,
      },
    }),
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { gte: now },
      },
    }),
    prisma.inboundLeadQuotation.aggregate({
      where: { organizationId },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.inboundLeadPayment.aggregate({
      where: { organizationId },
      _count: { _all: true },
      _sum: { receivedAmount: true },
    }),
    getSalesOrderStats(organizationId),
    prisma.trainingCourseSlot.count({
      where: {
        organizationId,
        status: "SCHEDULED",
        startsAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    leads,
    meetings,
    quotations: quotationAgg._count._all,
    quotationValue: Number(quotationAgg._sum.totalAmount ?? 0),
    payments: paymentAgg._count._all,
    paymentValue: Number(paymentAgg._sum.receivedAmount ?? 0),
    projectsRunning: soStats.inProgress,
    projectsDelivered: soStats.delivered,
    training,
  };
}

export async function listCrmMeetings(organizationId: string, take = 100) {
  return prisma.inboundLeadFollowUp.findMany({
    where: { organizationId },
    orderBy: { scheduledAt: "desc" },
    take,
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          company: true,
          status: true,
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listCrmQuotations(organizationId: string, take = 100) {
  return prisma.inboundLeadQuotation.findMany({
    where: { organizationId },
    orderBy: { quotationDate: "desc" },
    take,
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          company: true,
          status: true,
        },
      },
    },
  });
}

export async function listCrmPayments(organizationId: string, take = 100) {
  return prisma.inboundLeadPayment.findMany({
    where: { organizationId },
    orderBy: { receivedDate: "desc" },
    take,
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          company: true,
          status: true,
        },
      },
    },
  });
}

export async function getCrmMeetingsStats(organizationId: string) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const [upcoming, overdue, today] = await Promise.all([
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { gte: now },
      },
    }),
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { lt: now },
      },
    }),
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { gte: dayStart, lt: dayEnd },
      },
    }),
  ]);
  return { upcoming, overdue, today, total: upcoming + overdue };
}
