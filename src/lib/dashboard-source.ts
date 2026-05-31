import type { MetricTone, Role } from "@prisma/client";
import {
  DASHBOARD_CHART_COLORS,
  buildWeeklyActivitySeries,
  followUpTone,
  parseMetricNumericValue,
  paymentUrgency,
  toneToAccent,
  urgencyLabel,
} from "@/lib/dashboard-analytics";
import type { DashboardDataSource, DashboardPayload } from "@/lib/dashboard-types";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole, roleRank, ROLE_LABELS } from "@/lib/permissions";
import { taskVisibilityFilter } from "@/lib/tasks";
import { prisma } from "@/lib/db";

export type DashboardSourceRows = {
  metricCards: Array<{
    id: string;
    label: string;
    value: string;
    tone: MetricTone;
    minRole: Role;
    actionLabel: string;
    actionHref: string | null;
  }>;
  followUps: Array<{
    id: string;
    clientName: string;
    followUpAt: Date;
    remarks: string | null;
    minRole: Role;
    assigneeUserId: string | null;
  }>;
  pendingPayments: Array<{
    id: string;
    clientName: string;
    amount: string;
    dueAt: Date;
    minRole: Role;
  }>;
};

function canSeeByRole(userRole: Role, required: Role) {
  return roleRank(userRole) >= roleRank(required);
}

function canSeeAttentionItem(
  userRole: Role,
  userId: string,
  item: { minRole: Role; assigneeUserId: string | null },
) {
  if (!canSeeByRole(userRole, item.minRole)) {
    return false;
  }
  if (item.assigneeUserId && item.assigneeUserId !== userId) {
    return hasMinimumRole(userRole, "MANAGER");
  }
  return true;
}

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

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysUntilDue(dueAt: Date) {
  const today = startOfTodayMs();
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today) / 86400000);
}

function isFollowUpToday(followUpAt: Date) {
  const start = startOfToday().getTime();
  const end = startOfTomorrow().getTime();
  const t = followUpAt.getTime();
  return t >= start && t < end;
}

export async function loadDashboardRowsFromDatabase(
  organizationId: string,
): Promise<DashboardSourceRows> {
  const [metricCardsRaw, followUpsRaw, pendingPaymentsRaw] = await Promise.all([
    prisma.workspaceMetricCard.findMany({
      where: { organizationId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.workspaceFollowUp.findMany({
      where: { organizationId },
      orderBy: { followUpAt: "asc" },
    }),
    prisma.workspacePendingPayment.findMany({
      where: { organizationId },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return {
    metricCards: metricCardsRaw.map((card) => ({
      id: card.id,
      label: card.label,
      value: card.value,
      tone: card.tone,
      minRole: card.minRole,
      actionLabel: card.actionLabel,
      actionHref: card.actionHref,
    })),
    followUps: followUpsRaw.map((row) => ({
      id: row.id,
      clientName: row.clientName,
      followUpAt: row.followUpAt,
      remarks: row.remarks,
      minRole: row.minRole,
      assigneeUserId: row.assigneeUserId,
    })),
    pendingPayments: pendingPaymentsRaw.map((row) => ({
      id: row.id,
      clientName: row.clientName,
      amount: row.amount,
      dueAt: row.dueAt,
      minRole: row.minRole,
    })),
  };
}

export async function buildDashboardPayload(
  user: SessionUser,
  sourceRows: DashboardSourceRows,
  options: {
    dataSource: DashboardDataSource;
    spreadsheetId?: string | null;
  },
): Promise<DashboardPayload> {
  const taskWhere = taskVisibilityFilter(user);
  const roleScope =
    hasMinimumRole(user.role, "MANAGER") || user.role === "VIEWER"
      ? "organization"
      : "personal";

  const [tasks, approvalsPending] = await Promise.all([
    prisma.delegatedTask.findMany({
      where: taskWhere,
      select: { status: true, dueAt: true, completedAt: true },
    }),
    hasMinimumRole(user.role, "MANAGER")
      ? prisma.workspaceApproval.count({
          where: {
            organizationId: user.organizationId,
            status: "PENDING",
          },
        })
      : Promise.resolve(0),
  ]);

  const metricCards = sourceRows.metricCards
    .filter((card) => canSeeByRole(user.role, card.minRole))
    .map((card) => ({
      id: card.id,
      label: card.label,
      value: card.value,
      numericValue: parseMetricNumericValue(card.value),
      tone: card.tone,
      accent: toneToAccent(card.tone),
      actionLabel: card.actionLabel,
      actionHref: card.actionHref,
    }));

  const followUpsAll = sourceRows.followUps.filter((row) =>
    canSeeAttentionItem(user.role, user.id, row),
  );

  const followUpsToday = followUpsAll.filter((row) =>
    isFollowUpToday(row.followUpAt),
  );

  const followUps = followUpsToday.map((row) => ({
    id: row.id,
    clientName: row.clientName,
    followUpAt: row.followUpAt.toISOString(),
    remarks: row.remarks,
    tone: followUpTone(row.remarks),
    timeLabel: row.followUpAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  }));

  const pendingPayments = sourceRows.pendingPayments
    .filter((row) => canSeeByRole(user.role, row.minRole))
    .map((row) => {
      const urgency = paymentUrgency(row.dueAt);
      return {
        id: row.id,
        clientName: row.clientName,
        amount: row.amount,
        amountNumeric: parseMetricNumericValue(row.amount),
        dueAt: row.dueAt.toISOString(),
        urgency,
        urgencyLabel: urgencyLabel(urgency),
        daysUntilDue: daysUntilDue(row.dueAt),
      };
    });

  const now = Date.now();
  const todayMs = startOfTodayMs();
  let pending = 0;
  let inProgress = 0;
  let completedToday = 0;
  let overdue = 0;

  for (const task of tasks) {
    if (task.status === "PENDING") {
      pending += 1;
    } else if (task.status === "IN_PROGRESS") {
      inProgress += 1;
    } else if (
      task.status === "COMPLETED" &&
      task.completedAt &&
      task.completedAt.getTime() >= todayMs
    ) {
      completedToday += 1;
    }
    if (
      (task.status === "PENDING" || task.status === "IN_PROGRESS") &&
      task.dueAt.getTime() < now
    ) {
      overdue += 1;
    }
  }

  const paymentCounts = { overdue: 0, due_soon: 0, on_track: 0 };
  for (const row of pendingPayments) {
    paymentCounts[row.urgency] += 1;
  }

  const metricBars = metricCards
    .filter((card) => card.numericValue > 0)
    .slice(0, 8)
    .map((card, index) => ({
      name:
        card.label.length > 14 ? `${card.label.slice(0, 14)}...` : card.label,
      value: card.numericValue,
      fill: DASHBOARD_CHART_COLORS.series[index % DASHBOARD_CHART_COLORS.series.length],
    }));

  const charts = {
    weeklyActivity: buildWeeklyActivitySeries(
      followUpsAll.map((row) => row.followUpAt),
      tasks.map((task) => task.dueAt),
    ).map(({ label, followUps: fu, tasks: t }) => ({
      label,
      followUps: fu,
      tasks: t,
    })),
    taskBreakdown: [
      {
        name: "Pending",
        value: pending,
        fill: DASHBOARD_CHART_COLORS.warning,
      },
      {
        name: "In progress",
        value: inProgress,
        fill: DASHBOARD_CHART_COLORS.primary,
      },
      {
        name: "Done today",
        value: completedToday,
        fill: DASHBOARD_CHART_COLORS.success,
      },
      {
        name: "Overdue",
        value: overdue,
        fill: DASHBOARD_CHART_COLORS.danger,
      },
    ].filter((slice) => slice.value > 0),
    metricBars,
    paymentBreakdown: [
      {
        name: "Overdue",
        value: paymentCounts.overdue,
        fill: DASHBOARD_CHART_COLORS.danger,
      },
      {
        name: "Due soon",
        value: paymentCounts.due_soon,
        fill: DASHBOARD_CHART_COLORS.warning,
      },
      {
        name: "On track",
        value: paymentCounts.on_track,
        fill: DASHBOARD_CHART_COLORS.success,
      },
    ].filter((slice) => slice.value > 0),
  };

  return {
    metricCards,
    followUps,
    pendingPayments,
    taskStats: { pending, inProgress, completedToday, overdue },
    charts,
    approvalsPending,
    showApprovals: hasMinimumRole(user.role, "MANAGER"),
    roleScope,
    roleLabel: ROLE_LABELS[user.role],
    dataSource: options.dataSource,
    spreadsheetId: options.spreadsheetId ?? null,
  };
}
