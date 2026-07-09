import { prisma } from "@/lib/db";
import { mergeLeadContactWhere } from "@/lib/leads/contact-validation";
import { getFmsStepSummaryForLead } from "@/lib/leads/fms-bridge";
import type { LeadsSortOrder } from "@/lib/leads/list-params";
import { computePipeMetrics } from "@/lib/leads/pipe-metrics";
import {
  leadCapturedAtWhere,
  type LeadsPeriodRange,
} from "@/lib/leads/period";
import type { InboundLeadStatus } from "@prisma/client";
import { OPEN_LEAD_STATUSES } from "@/lib/leads/status-labels";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export async function getInboundLeadWorkspaceTotal(organizationId: string) {
  return prisma.inboundLead.count({
    where: mergeLeadContactWhere({ organizationId }),
  });
}

export async function getLeadsMachineStatsForPeriod(
  organizationId: string,
  period: LeadsPeriodRange,
) {
  const periodWhere = mergeLeadContactWhere({
    organizationId,
    ...leadCapturedAtWhere(period),
  });

  const [
    total,
    byChannel,
    byStatus,
    withFms,
    openPipeline,
    won,
    lost,
  ] = await Promise.all([
    prisma.inboundLead.count({ where: periodWhere }),
    prisma.inboundLead.groupBy({
      by: ["channel"],
      where: periodWhere,
      _count: { _all: true },
    }),
    prisma.inboundLead.groupBy({
      by: ["status"],
      where: periodWhere,
      _count: { _all: true },
    }),
    prisma.inboundLead.count({
      where: { ...periodWhere, fmsInstanceId: { not: null } },
    }),
    prisma.inboundLead.count({
      where: {
        ...periodWhere,
        status: { in: OPEN_LEAD_STATUSES },
      },
    }),
    prisma.inboundLead.count({
      where: { ...periodWhere, status: "WON" },
    }),
    prisma.inboundLead.count({
      where: { ...periodWhere, status: "LOST" },
    }),
  ]);

  return {
    total,
    withFms,
    openPipeline,
    won,
    lost,
    conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
    byChannel: Object.fromEntries(
      byChannel.map((row) => [row.channel, row._count._all]),
    ),
    byStatus: Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all]),
    ),
    periodLabel: period.periodLabel,
  };
}

export async function listInboundLeadsForPeriodPaginated(
  organizationId: string,
  period: LeadsPeriodRange,
  options: {
    page: number;
    pageSize: number;
    sort: LeadsSortOrder;
    status?: InboundLeadStatus;
    category?: string;
    q?: string;
  },
) {
  const where = mergeLeadContactWhere({
    organizationId,
    ...leadCapturedAtWhere(period),
    ...(options.status ? { status: options.status } : {}),
    ...(options.category ? { category: options.category } : {}),
    ...(options.q
      ? {
          OR: [
            { name: { contains: options.q, mode: "insensitive" } },
            { phone: { contains: options.q, mode: "insensitive" } },
            { email: { contains: options.q, mode: "insensitive" } },
            { requirement: { contains: options.q, mode: "insensitive" } },
          ],
        }
      : {}),
  });

  const orderBy =
    options.sort === "oldest"
      ? [
          { capturedAt: { sort: "asc" as const, nulls: "last" as const } },
          { createdAt: "asc" as const },
        ]
      : [
          { capturedAt: { sort: "desc" as const, nulls: "last" as const } },
          { createdAt: "desc" as const },
        ];

  const skip = (options.page - 1) * options.pageSize;

  const [total, leads] = await Promise.all([
    prisma.inboundLead.count({ where }),
    prisma.inboundLead.findMany({
      where,
      orderBy,
      skip,
      take: options.pageSize,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        followUps: {
          where: { completedAt: null },
          orderBy: { scheduledAt: "asc" },
          take: 5,
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        payments: {
          orderBy: { receivedDate: "desc" },
          take: 10,
        },
        quotations: {
          orderBy: { quotationDate: "desc" },
          take: 5,
          include: { lines: true },
        },
        offeredServices: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  return {
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
    leads,
  };
}

export async function listInboundLeadActivities(leadId: string, organizationId: string) {
  return prisma.inboundLeadActivity.findMany({
    where: { leadId, organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getLeadsPipeMetricsForPeriod(
  organizationId: string,
  period: LeadsPeriodRange,
) {
  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      ...leadCapturedAtWhere(period),
    }),
    select: {
      status: true,
      category: true,
      pipeValue: true,
      quotationValue: true,
    },
  });

  return computePipeMetrics(leads);
}

export async function getLeadsCategoryBreakdown(
  organizationId: string,
  period: LeadsPeriodRange,
) {
  const rows = await prisma.inboundLead.groupBy({
    by: ["category"],
    where: mergeLeadContactWhere({
      organizationId,
      ...leadCapturedAtWhere(period),
    }),
    _count: { _all: true },
  });

  return rows.map((row) => ({
    category: row.category ?? "GENERAL",
    count: row._count._all,
  }));
}

export async function listInboundLeadsForPeriod(
  organizationId: string,
  period: LeadsPeriodRange,
) {
  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      ...leadCapturedAtWhere(period),
    }),
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      followUps: {
        where: { completedAt: null },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
      fmsInstance: {
        select: {
          id: true,
          status: true,
          referenceLabel: true,
        },
      },
    },
  });

  return Promise.all(
    leads.map(async (lead) => ({
      ...lead,
      fmsStep: await getFmsStepSummaryForLead(lead.fmsInstanceId),
    })),
  );
}

export async function getLeadsMachineStats(organizationId: string) {
  const todayStart = startOfToday();
  const todayEnd = startOfTomorrow();

  const leadScope = mergeLeadContactWhere({ organizationId });

  const [
    total,
    byChannel,
    unassigned,
    todayFollowUps,
    overdueFollowUps,
    withFms,
    openPipeline,
  ] = await Promise.all([
    prisma.inboundLead.count({ where: leadScope }),
    prisma.inboundLead.groupBy({
      by: ["channel"],
      where: leadScope,
      _count: { _all: true },
    }),
    prisma.inboundLead.count({
      where: mergeLeadContactWhere({
        organizationId,
        assignedToId: null,
        status: { notIn: ["WON", "LOST"] },
      }),
    }),
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.inboundLeadFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { lt: todayStart },
      },
    }),
    prisma.inboundLead.count({
      where: mergeLeadContactWhere({
        organizationId,
        fmsInstanceId: { not: null },
      }),
    }),
    prisma.inboundLead.count({
      where: mergeLeadContactWhere({
        organizationId,
        status: { in: OPEN_LEAD_STATUSES },
      }),
    }),
  ]);

  return {
    total,
    unassigned,
    todayFollowUps,
    overdueFollowUps,
    withFms,
    openPipeline,
    byChannel: Object.fromEntries(
      byChannel.map((row) => [row.channel, row._count._all]),
    ),
  };
}

export async function listInboundLeads(organizationId: string) {
  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({ organizationId }),
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      followUps: {
        where: { completedAt: null },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
      fmsInstance: {
        select: {
          id: true,
          status: true,
          referenceLabel: true,
        },
      },
    },
  });

  return Promise.all(
    leads.map(async (lead) => ({
      ...lead,
      fmsStep: await getFmsStepSummaryForLead(lead.fmsInstanceId),
    })),
  );
}

export async function listLeadConnections(organizationId: string) {
  return prisma.leadIngestConnection.findMany({
    where: { organizationId },
    orderBy: { channel: "asc" },
  });
}

export async function getGoogleSheetsLeadConnection(organizationId: string) {
  return prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId,
        channel: "GOOGLE_SHEETS",
      },
    },
  });
}

export async function listTodayLeadFollowUps(organizationId: string) {
  const todayStart = startOfToday();
  const todayEnd = startOfTomorrow();

  return prisma.inboundLeadFollowUp.findMany({
    where: {
      organizationId,
      completedAt: null,
      scheduledAt: { gte: todayStart, lt: todayEnd },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          channel: true,
          status: true,
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listOverdueLeadFollowUps(organizationId: string) {
  const todayStart = startOfToday();

  return prisma.inboundLeadFollowUp.findMany({
    where: {
      organizationId,
      completedAt: null,
      scheduledAt: { lt: todayStart },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          channel: true,
          status: true,
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}
