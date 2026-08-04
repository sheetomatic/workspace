import { prisma } from "@/lib/db";
import { formatInr, leadCategoryLabel, resolveLeadCategoryId } from "@/lib/leads/categories";

/** IST month boundaries for a "YYYY-MM" key. */
export function teamPerfMonthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(`${monthKey}-01T00:00:00+05:30`);
  const nextKey =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = new Date(`${nextKey}-01T00:00:00+05:30`);
  return { start, end };
}

export function currentMonthKeyIst(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function teamPerfMonthLabel(monthKey: string) {
  const { start } = teamPerfMonthRange(monthKey);
  return start.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export type TeamPerfMetricKey =
  | "leads"
  | "calls"
  | "meetings"
  | "quotes"
  | "converted"
  | "payments"
  | "projectsDelivered"
  | "projectsPending"
  | "paymentFollowUps"
  | "overduePayments";

export type TeamMemberPerf = {
  userId: string | null;
  name: string;
  leads: number;
  calls: number;
  meetings: number;
  quotes: number;
  quotesValue: number;
  quotesValueLabel: string;
  converted: number;
  payments: number;
  paymentsValue: number;
  paymentsValueLabel: string;
  projectsDelivered: number;
  projectsPending: number;
  paymentFollowUps: number;
  overduePayments: number;
};

export type TeamPerfCategoryRow = {
  category: string;
  label: string;
  count: number;
  value: number;
  valueLabel: string;
};

export type TeamPerformanceData = {
  monthKey: string;
  monthLabel: string;
  members: TeamMemberPerf[];
  totals: TeamMemberPerf;
  byCategory: TeamPerfCategoryRow[];
};

const WON_BODY = "Status changed to WON";

function capturedInRange(start: Date, end: Date) {
  return {
    OR: [
      { capturedAt: { gte: start, lt: end } },
      { capturedAt: null, createdAt: { gte: start, lt: end } },
    ],
  };
}

function emptyPerf(userId: string | null, name: string): TeamMemberPerf {
  return {
    userId,
    name,
    leads: 0,
    calls: 0,
    meetings: 0,
    quotes: 0,
    quotesValue: 0,
    quotesValueLabel: formatInr(0),
    converted: 0,
    payments: 0,
    paymentsValue: 0,
    paymentsValueLabel: formatInr(0),
    projectsDelivered: 0,
    projectsPending: 0,
    paymentFollowUps: 0,
    overduePayments: 0,
  };
}

export async function getTeamPerformance(
  organizationId: string,
  monthKey: string,
): Promise<TeamPerformanceData> {
  const { start, end } = teamPerfMonthRange(monthKey);
  const now = new Date();

  const [
    memberships,
    leadsByAssignee,
    callActivities,
    meetingsByHost,
    quotesByCreator,
    wonActivities,
    paymentRows,
    deliveredByAssignee,
    pendingByAssignee,
    payFollowUpsByAssignee,
    overdueByAssignee,
    categoryRows,
  ] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.inboundLead.groupBy({
      by: ["assignedToId"],
      where: {
        organizationId,
        archivedAt: null,
        ...capturedInRange(start, end),
      },
      _count: { _all: true },
    }),
    prisma.inboundLeadActivity.groupBy({
      by: ["createdByUserId"],
      where: {
        organizationId,
        type: "CALL",
        createdAt: { gte: start, lt: end },
      },
      _count: { _all: true },
    }),
    prisma.inboundLeadFollowUp.groupBy({
      by: ["assigneeUserId"],
      where: {
        organizationId,
        type: "MEETING",
        scheduledAt: { gte: start, lt: end },
      },
      _count: { _all: true },
    }),
    prisma.inboundLeadQuotation.groupBy({
      by: ["createdByUserId"],
      where: {
        organizationId,
        requestType: "PROPOSAL",
        quotationDate: { gte: start, lt: end },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.inboundLeadActivity.findMany({
      where: {
        organizationId,
        type: "STATUS_CHANGE",
        body: WON_BODY,
        createdAt: { gte: start, lt: end },
      },
      select: { leadId: true, lead: { select: { assignedToId: true } } },
    }),
    prisma.inboundLeadPayment.findMany({
      where: {
        organizationId,
        receivedDate: { gte: start, lt: end },
      },
      select: {
        receivedAmount: true,
        lead: { select: { assignedToId: true } },
      },
    }),
    prisma.delegatedTask.groupBy({
      by: ["assigneeUserId"],
      where: {
        organizationId,
        category: "Project",
        status: "COMPLETED",
        completedAt: { gte: start, lt: end },
      },
      _count: { _all: true },
    }),
    prisma.delegatedTask.groupBy({
      by: ["assigneeUserId"],
      where: {
        organizationId,
        category: "Project",
        status: { not: "COMPLETED" },
      },
      _count: { _all: true },
    }),
    prisma.inboundLeadFollowUp.groupBy({
      by: ["assigneeUserId"],
      where: {
        organizationId,
        type: "PAYMENT",
        scheduledAt: { gte: start, lt: end },
      },
      _count: { _all: true },
    }),
    prisma.inboundLeadFollowUp.groupBy({
      by: ["assigneeUserId"],
      where: {
        organizationId,
        type: "PAYMENT",
        completedAt: null,
        scheduledAt: { lt: now },
      },
      _count: { _all: true },
    }),
    prisma.inboundLead.groupBy({
      by: ["category"],
      where: {
        organizationId,
        archivedAt: null,
        ...capturedInRange(start, end),
      },
      _count: { _all: true },
      _sum: { quotationValue: true },
    }),
  ]);

  const byUser = new Map<string, TeamMemberPerf>();
  for (const m of memberships) {
    byUser.set(
      m.user.id,
      emptyPerf(m.user.id, m.user.name?.trim() || m.user.email),
    );
  }
  const unassigned = emptyPerf(null, "Unassigned");

  const bucket = (userId: string | null | undefined): TeamMemberPerf => {
    if (!userId) return unassigned;
    let entry = byUser.get(userId);
    if (!entry) {
      // Former member who still has records — show them anyway.
      entry = emptyPerf(userId, "Former member");
      byUser.set(userId, entry);
    }
    return entry;
  };

  for (const row of leadsByAssignee) bucket(row.assignedToId).leads += row._count._all;
  for (const row of callActivities) bucket(row.createdByUserId).calls += row._count._all;
  for (const row of meetingsByHost) bucket(row.assigneeUserId).meetings += row._count._all;
  for (const row of quotesByCreator) {
    const entry = bucket(row.createdByUserId);
    entry.quotes += row._count._all;
    entry.quotesValue += Number(row._sum.totalAmount ?? 0);
  }
  {
    // Count each lead once even if its status bounced to WON multiple times.
    const seen = new Set<string>();
    for (const row of wonActivities) {
      if (seen.has(row.leadId)) continue;
      seen.add(row.leadId);
      bucket(row.lead?.assignedToId).converted += 1;
    }
  }
  for (const row of paymentRows) {
    const entry = bucket(row.lead?.assignedToId);
    entry.payments += 1;
    entry.paymentsValue += Number(row.receivedAmount ?? 0);
  }
  for (const row of deliveredByAssignee) bucket(row.assigneeUserId).projectsDelivered += row._count._all;
  for (const row of pendingByAssignee) bucket(row.assigneeUserId).projectsPending += row._count._all;
  for (const row of payFollowUpsByAssignee) bucket(row.assigneeUserId).paymentFollowUps += row._count._all;
  for (const row of overdueByAssignee) bucket(row.assigneeUserId).overduePayments += row._count._all;

  const members = [...byUser.values()];
  if (
    unassigned.leads ||
    unassigned.calls ||
    unassigned.meetings ||
    unassigned.quotes ||
    unassigned.converted ||
    unassigned.payments
  ) {
    members.push(unassigned);
  }

  const totals = emptyPerf(null, "Team total");
  for (const m of members) {
    totals.leads += m.leads;
    totals.calls += m.calls;
    totals.meetings += m.meetings;
    totals.quotes += m.quotes;
    totals.quotesValue += m.quotesValue;
    totals.converted += m.converted;
    totals.payments += m.payments;
    totals.paymentsValue += m.paymentsValue;
    totals.projectsDelivered += m.projectsDelivered;
    totals.projectsPending += m.projectsPending;
    totals.paymentFollowUps += m.paymentFollowUps;
    totals.overduePayments += m.overduePayments;
  }

  for (const m of [...members, totals]) {
    m.quotesValueLabel = formatInr(m.quotesValue);
    m.paymentsValueLabel = formatInr(m.paymentsValue);
  }

  // Sort busiest members first; keep members with zero activity at the end.
  members.sort(
    (a, b) =>
      b.leads + b.calls + b.meetings + b.quotes - (a.leads + a.calls + a.meetings + a.quotes),
  );

  const categoryAgg = new Map<string, { count: number; value: number }>();
  for (const row of categoryRows) {
    const id = resolveLeadCategoryId(row.category);
    const entry = categoryAgg.get(id) ?? { count: 0, value: 0 };
    entry.count += row._count._all;
    entry.value += Number(row._sum.quotationValue ?? 0);
    categoryAgg.set(id, entry);
  }
  const byCategory: TeamPerfCategoryRow[] = [...categoryAgg.entries()]
    .map(([category, agg]) => ({
      category,
      label: leadCategoryLabel(category),
      count: agg.count,
      value: agg.value,
      valueLabel: formatInr(agg.value),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    monthKey,
    monthLabel: teamPerfMonthLabel(monthKey),
    members,
    totals,
    byCategory,
  };
}

export type TeamPerfDrilldownItem = {
  id: string;
  title: string;
  subtitle: string | null;
  dateLabel: string;
  amountLabel: string | null;
};

function fmtDate(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function leadTitle(lead: { name: string | null; company: string | null; phone: string | null } | null | undefined) {
  if (!lead) return "Lead";
  return lead.name?.trim() || lead.company?.trim() || lead.phone || "Lead";
}

/** Items behind one metric card. userId null = whole team. */
export async function getTeamPerformanceDrilldown(
  organizationId: string,
  monthKey: string,
  metric: TeamPerfMetricKey,
  userId: string | null,
): Promise<TeamPerfDrilldownItem[]> {
  const { start, end } = teamPerfMonthRange(monthKey);
  const now = new Date();
  const TAKE = 200;
  const leadSelect = { name: true, company: true, phone: true } as const;

  switch (metric) {
    case "leads": {
      const rows = await prisma.inboundLead.findMany({
        where: {
          organizationId,
          archivedAt: null,
          ...capturedInRange(start, end),
          ...(userId !== null ? { assignedToId: userId } : {}),
        },
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          status: true,
          capturedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: leadTitle(r),
        subtitle: r.status.replaceAll("_", " "),
        dateLabel: fmtDate(r.capturedAt ?? r.createdAt),
        amountLabel: null,
      }));
    }
    case "calls": {
      const rows = await prisma.inboundLeadActivity.findMany({
        where: {
          organizationId,
          type: "CALL",
          createdAt: { gte: start, lt: end },
          ...(userId !== null ? { createdByUserId: userId } : {}),
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          lead: { select: leadSelect },
        },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: leadTitle(r.lead),
        subtitle: r.body,
        dateLabel: fmtDate(r.createdAt),
        amountLabel: null,
      }));
    }
    case "meetings": {
      const rows = await prisma.inboundLeadFollowUp.findMany({
        where: {
          organizationId,
          type: "MEETING",
          scheduledAt: { gte: start, lt: end },
          ...(userId !== null ? { assigneeUserId: userId } : {}),
        },
        select: {
          id: true,
          scheduledAt: true,
          completedAt: true,
          notes: true,
          lead: { select: leadSelect },
        },
        orderBy: { scheduledAt: "desc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: leadTitle(r.lead),
        subtitle: r.completedAt ? "Done" : "Scheduled",
        dateLabel: fmtDate(r.scheduledAt),
        amountLabel: null,
      }));
    }
    case "quotes": {
      const rows = await prisma.inboundLeadQuotation.findMany({
        where: {
          organizationId,
          requestType: "PROPOSAL",
          quotationDate: { gte: start, lt: end },
          ...(userId !== null ? { createdByUserId: userId } : {}),
        },
        select: {
          id: true,
          quotationNumber: true,
          quotationDate: true,
          totalAmount: true,
          lead: { select: leadSelect },
        },
        orderBy: { quotationDate: "desc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: leadTitle(r.lead),
        subtitle: r.quotationNumber,
        dateLabel: fmtDate(r.quotationDate),
        amountLabel: formatInr(Number(r.totalAmount ?? 0)),
      }));
    }
    case "converted": {
      const rows = await prisma.inboundLeadActivity.findMany({
        where: {
          organizationId,
          type: "STATUS_CHANGE",
          body: WON_BODY,
          createdAt: { gte: start, lt: end },
          ...(userId !== null ? { lead: { assignedToId: userId } } : {}),
        },
        select: {
          id: true,
          leadId: true,
          createdAt: true,
          lead: { select: { ...leadSelect, quotationValue: true } },
        },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      });
      const seen = new Set<string>();
      const items: TeamPerfDrilldownItem[] = [];
      for (const r of rows) {
        if (seen.has(r.leadId)) continue;
        seen.add(r.leadId);
        items.push({
          id: r.id,
          title: leadTitle(r.lead),
          subtitle: "Won",
          dateLabel: fmtDate(r.createdAt),
          amountLabel: r.lead?.quotationValue
            ? formatInr(Number(r.lead.quotationValue))
            : null,
        });
      }
      return items;
    }
    case "payments": {
      const rows = await prisma.inboundLeadPayment.findMany({
        where: {
          organizationId,
          receivedDate: { gte: start, lt: end },
          ...(userId !== null ? { lead: { assignedToId: userId } } : {}),
        },
        select: {
          id: true,
          receivedAmount: true,
          receivedDate: true,
          paymentType: true,
          lead: { select: leadSelect },
        },
        orderBy: { receivedDate: "desc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: leadTitle(r.lead),
        subtitle: r.paymentType.replaceAll("_", " "),
        dateLabel: fmtDate(r.receivedDate),
        amountLabel: formatInr(Number(r.receivedAmount ?? 0)),
      }));
    }
    case "projectsDelivered":
    case "projectsPending": {
      const delivered = metric === "projectsDelivered";
      const rows = await prisma.delegatedTask.findMany({
        where: {
          organizationId,
          category: "Project",
          ...(delivered
            ? { status: "COMPLETED", completedAt: { gte: start, lt: end } }
            : { status: { not: "COMPLETED" } }),
          ...(userId !== null ? { assigneeUserId: userId } : {}),
        },
        select: {
          id: true,
          title: true,
          status: true,
          dueAt: true,
          completedAt: true,
        },
        orderBy: delivered ? { completedAt: "desc" } : { dueAt: "asc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: delivered
          ? "Delivered"
          : `${r.status.replaceAll("_", " ")}${r.dueAt < now ? " · OVERDUE" : ""}`,
        dateLabel: fmtDate(delivered ? r.completedAt : r.dueAt),
        amountLabel: null,
      }));
    }
    case "paymentFollowUps":
    case "overduePayments": {
      const overdue = metric === "overduePayments";
      const rows = await prisma.inboundLeadFollowUp.findMany({
        where: {
          organizationId,
          type: "PAYMENT",
          ...(overdue
            ? { completedAt: null, scheduledAt: { lt: now } }
            : { scheduledAt: { gte: start, lt: end } }),
          ...(userId !== null ? { assigneeUserId: userId } : {}),
        },
        select: {
          id: true,
          scheduledAt: true,
          completedAt: true,
          notes: true,
          lead: { select: leadSelect },
        },
        orderBy: { scheduledAt: overdue ? "asc" : "desc" },
        take: TAKE,
      });
      return rows.map((r) => ({
        id: r.id,
        title: leadTitle(r.lead),
        subtitle: overdue
          ? "Overdue"
          : r.completedAt
            ? "Done"
            : "Pending",
        dateLabel: fmtDate(r.scheduledAt),
        amountLabel: null,
      }));
    }
  }
}
