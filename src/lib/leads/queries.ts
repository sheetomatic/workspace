import { prisma } from "@/lib/db";
import { getFmsStepSummaryForLead } from "@/lib/leads/fms-bridge";

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

export async function getLeadsMachineStats(organizationId: string) {
  const todayStart = startOfToday();
  const todayEnd = startOfTomorrow();

  const [
    total,
    byChannel,
    unassigned,
    todayFollowUps,
    overdueFollowUps,
    withFms,
    openPipeline,
  ] = await Promise.all([
    prisma.inboundLead.count({ where: { organizationId } }),
    prisma.inboundLead.groupBy({
      by: ["channel"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.inboundLead.count({
      where: { organizationId, assignedToId: null, status: { notIn: ["WON", "LOST"] } },
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
      where: { organizationId, fmsInstanceId: { not: null } },
    }),
    prisma.inboundLead.count({
      where: {
        organizationId,
        status: { in: ["NEW", "CONTACTED", "FOLLOW_UP", "QUALIFIED"] },
      },
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
    where: { organizationId },
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
