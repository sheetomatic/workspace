import "server-only";

import { prisma } from "@/lib/db";
import {
  countCrmMeetings,
  istYmd,
  startOfIstDay,
} from "@/lib/leads/crm-meetings";
import { mergeLeadContactWhere } from "@/lib/leads/contact-validation";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { NEXT_TIME_LEAD_STATUSES } from "@/lib/leads/status-labels";
import { getSalesOrderStats } from "@/lib/sales-orders/queries";

export type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";

/** Lightweight counts for CRM sub-module nav badges. */
export async function getCrmModuleNavCounts(
  organizationId: string,
): Promise<CrmModuleNavCounts> {
  const now = new Date();
  const [
    leads,
    nextTime,
    meetings,
    quotationAgg,
    paymentAgg,
    soStats,
    training,
    services,
  ] = await Promise.all([
    prisma.inboundLead.count({
      where: {
        organizationId,
        archivedAt: null,
        mergedIntoId: null,
        status: { notIn: NEXT_TIME_LEAD_STATUSES },
      },
    }),
    prisma.inboundLead.count({
      where: {
        organizationId,
        archivedAt: null,
        mergedIntoId: null,
        status: { in: NEXT_TIME_LEAD_STATUSES },
      },
    }),
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        type: "MEETING",
        completedAt: null,
        scheduledAt: { gte: startOfIstDay(now) },
      },
    }),
    prisma.inboundLeadQuotation.aggregate({
      where: { organizationId },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.inboundLeadPayment.aggregate({
      where: { organizationId, paymentType: { not: "ADJUSTMENT" } },
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
    prisma.leadServiceCatalog.count({
      where: { organizationId, isActive: true },
    }),
  ]);

  return {
    leads,
    nextTime,
    meetings,
    quotations: quotationAgg._count._all,
    quotationValue: Number(quotationAgg._sum.totalAmount ?? 0),
    payments: paymentAgg._count._all,
    paymentValue: Number(paymentAgg._sum.receivedAmount ?? 0),
    projectsRunning: soStats.inProgress,
    projectsDelivered: soStats.delivered,
    training,
    services,
  };
}

export async function listCrmMeetings(organizationId: string, take = 400) {
  const from = new Date(startOfIstDay().getTime() - 90 * 86_400_000);
  return prisma.inboundLeadFollowUp.findMany({
    where: {
      organizationId,
      type: "MEETING",
      OR: [
        { completedAt: null, scheduledAt: { gte: from } },
        { completedAt: { gte: from } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take,
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          company: true,
          status: true,
          meetingNotes: true,
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

export async function listCrmNextTimeLeads(
  organizationId: string,
  options?: { take?: number; assignedToId?: string },
) {
  return prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      status: { in: NEXT_TIME_LEAD_STATUSES },
      ...(options?.assignedToId ? { assignedToId: options.assignedToId } : {}),
    }),
    orderBy: [{ modifiedAt: "desc" }, { createdAt: "desc" }],
    take: options?.take ?? 200,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      company: true,
      category: true,
      requirement: true,
      pipeValue: true,
      quotationValue: true,
      modifiedAt: true,
      capturedAt: true,
      createdAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getCrmMeetingsStats(organizationId: string) {
  const rows = await listCrmMeetings(organizationId);
  const counts = countCrmMeetings(
    rows.map((row) => ({
      ymd: istYmd(new Date(row.scheduledAt)),
      completed: Boolean(row.completedAt),
    })),
  );
  return { ...counts, total: counts.upcoming };
}
