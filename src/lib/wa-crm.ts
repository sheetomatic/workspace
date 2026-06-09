import { prisma } from "@/lib/db";

export {
  WA_PIPELINE_LABELS,
  formatFollowUpTime,
  followUpUrgency,
  parseContactTags,
} from "@/lib/wa-crm-shared";

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

function endOfWeek() {
  const d = startOfToday();
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday + 1);
  return d;
}

export async function getWaCrmStats(organizationId: string, userId?: string) {
  const todayStart = startOfToday();
  const todayEnd = startOfTomorrow();

  const [
    totalLeads,
    unassigned,
    openPipeline,
    todayFollowUps,
    overdueFollowUps,
    myTodayFollowUps,
    hotLeads,
  ] = await Promise.all([
    prisma.waContact.count({ where: { organizationId } }),
    prisma.waContact.count({
      where: { organizationId, assignedToId: null, pipelineStage: { not: "LOST" } },
    }),
    prisma.waContact.count({
      where: {
        organizationId,
        pipelineStage: { in: ["NEW", "QUALIFIED", "DEMO_BOOKED"] },
      },
    }),
    prisma.waContactFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.waContactFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { lt: todayStart },
      },
    }),
    userId
      ? prisma.waContactFollowUp.count({
          where: {
            organizationId,
            assigneeUserId: userId,
            completedAt: null,
            scheduledAt: { gte: todayStart, lt: todayEnd },
          },
        })
      : Promise.resolve(0),
    prisma.waContact.count({
      where: {
        organizationId,
        OR: [{ unreadCount: { gt: 0 } }, { pipelineStage: "NEW" }],
        pipelineStage: { notIn: ["WON", "LOST"] },
      },
    }),
  ]);

  return {
    totalLeads,
    unassigned,
    openPipeline,
    todayFollowUps,
    overdueFollowUps,
    myTodayFollowUps,
    hotLeads,
    dueThisWeek: await prisma.waContactFollowUp.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { gte: todayStart, lt: endOfWeek() },
      },
    }),
  };
}

export async function listWaCrmLeads(organizationId: string) {
  return prisma.waContact.findMany({
    where: { organizationId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      followUps: {
        where: { completedAt: null },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
      conversations: {
        where: { status: "OPEN" },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { lastMessageAt: "desc" }],
    take: 300,
  });
}

export async function listTodayWaFollowUps(organizationId: string) {
  const todayStart = startOfToday();
  const todayEnd = startOfTomorrow();

  return prisma.waContactFollowUp.findMany({
    where: {
      organizationId,
      completedAt: null,
      scheduledAt: { gte: todayStart, lt: todayEnd },
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          pipelineStage: true,
          conversations: {
            where: { status: "OPEN" },
            take: 1,
            select: { id: true },
          },
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
}

export async function listOverdueWaFollowUps(organizationId: string) {
  const todayStart = startOfToday();

  return prisma.waContactFollowUp.findMany({
    where: {
      organizationId,
      completedAt: null,
      scheduledAt: { lt: todayStart },
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          pipelineStage: true,
          conversations: {
            where: { status: "OPEN" },
            take: 1,
            select: { id: true },
          },
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 30,
  });
}

export async function listWaCrmContactsForSheetExport(organizationId: string) {
  const contacts = await prisma.waContact.findMany({
    where: { organizationId },
    include: {
      assignedTo: { select: { name: true, email: true } },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { preview: true },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  return contacts.map((contact) => ({
    id: contact.id,
    phone: contact.phone,
    name: contact.name,
    email: contact.email,
    city: contact.city,
    requirementDescription: contact.requirementDescription,
    intent: contact.intent,
    source: contact.source,
    pipelineStage: contact.pipelineStage,
    notes: contact.notes,
    tags: contact.tags,
    leadCaptureComplete: contact.leadCaptureComplete,
    lastMessageAt: contact.lastMessageAt,
    nextFollowUpAt: contact.nextFollowUpAt,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    assignedTo: contact.assignedTo,
    lastMessagePreview: contact.conversations[0]?.preview ?? null,
  }));
}

export async function syncContactNextFollowUp(
  organizationId: string,
  contactId: string,
) {
  const next = await prisma.waContactFollowUp.findFirst({
    where: {
      organizationId,
      contactId,
      completedAt: null,
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    select: { scheduledAt: true },
  });

  await prisma.waContact.updateMany({
    where: { id: contactId, organizationId },
    data: { nextFollowUpAt: next?.scheduledAt ?? null },
  });
}

