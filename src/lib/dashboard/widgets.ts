import "server-only";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentWeekRange } from "@/lib/em/em-period";
import { getEmReadyPayload } from "@/lib/em/em-ready-data";
import {
  getFmsWidgetCounts,
  getRecruitmentFmsWidgetCounts,
} from "@/lib/fms/queries";
import { RECRUITMENT_FMS_FLOW, SALES_FULFILLMENT_FMS_FLOWS } from "@/lib/fms/sales-fulfillment";
import { getStockRows } from "@/lib/ims/ims-store";
import { mergeLeadContactWhere } from "@/lib/leads/contact-validation";
import { hasMinimumRole } from "@/lib/permissions";
import { getSalesOrderWidgetStats } from "@/lib/sales-orders/queries";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export type LeadsWidgetData = {
  open: number;
  newThisWeek: number;
  followUpsDue: number;
};

export type SalesOrdersWidgetData = {
  open: number;
  pipelineValue: number;
  delayedFms: number;
};

export type FmsWidgetData = {
  activeInstances: number;
  delayedSteps: number;
  bottleneck: { name: string; delayed: number } | null;
};

export type ImsWidgetData = {
  belowReorder: number;
  stockOuts: number;
  pendingQc: number;
};

export type ChecklistsWidgetData = {
  dueToday: number;
  overdue: number;
};

export type EmWidgetData = {
  people: { name: string; deficitPct: number }[];
  exceptions: number;
};

export type RecruitmentWidgetData = {
  active: number;
  stages: { name: string; count: number }[];
};

export type WidgetDashboardData = {
  scope: "organization" | "personal";
  leads: LeadsWidgetData | null;
  salesOrders: SalesOrdersWidgetData | null;
  fms: FmsWidgetData | null;
  ims: ImsWidgetData | null;
  checklists: ChecklistsWidgetData | null;
  em: EmWidgetData | null;
  recruitment: RecruitmentWidgetData | null;
};

const OPEN_LEAD_STATUSES_EXCLUDED = ["WON", "LOST"] as const;

async function loadLeadsWidget(
  organizationId: string,
  assignedToId?: string,
): Promise<LeadsWidgetData> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const weekStart = currentWeekRange().start;
  const scopeFilter = assignedToId ? { assignedToId } : {};
  const openWhere = mergeLeadContactWhere({
    organizationId,
    status: { notIn: [...OPEN_LEAD_STATUSES_EXCLUDED] },
    ...scopeFilter,
  });
  const weekWhere = mergeLeadContactWhere({
    organizationId,
    createdAt: { gte: weekStart },
    ...scopeFilter,
  });

  const [open, newThisWeek, followUpsDue] = await Promise.all([
    prisma.inboundLead.count({ where: openWhere }),
    prisma.inboundLead.count({ where: weekWhere }),
    prisma.inboundLead.count({
      where: { ...openWhere, nextFollowUpAt: { lte: endOfToday } },
    }),
  ]);

  return { open, newThisWeek, followUpsDue };
}

async function loadImsWidget(organizationId: string): Promise<ImsWidgetData> {
  const [rows, pendingQc] = await Promise.all([
    getStockRows(organizationId),
    prisma.imsQcInspection.count({
      where: { organizationId, status: "PENDING" },
    }),
  ]);

  let belowReorder = 0;
  let stockOuts = 0;
  for (const row of rows) {
    if (row.status === "red" || row.status === "orange") {
      belowReorder += 1;
    }
    if (row.usableQty <= 0) {
      stockOuts += 1;
    }
  }

  return { belowReorder, stockOuts, pendingQc };
}

async function loadChecklistsWidget(
  organizationId: string,
  assigneeUserId?: string,
): Promise<ChecklistsWidgetData> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const scopeFilter = assigneeUserId ? { assigneeUserId } : {};

  const [dueToday, overdue] = await Promise.all([
    prisma.checklistOccurrence.count({
      where: {
        organizationId,
        status: "PENDING",
        plannedAt: { gte: startOfToday, lte: endOfToday },
        ...scopeFilter,
      },
    }),
    prisma.checklistOccurrence.count({
      where: {
        organizationId,
        status: { in: ["PENDING", "OVERDUE"] },
        plannedAt: { lt: now },
        ...scopeFilter,
      },
    }),
  ]);

  return { dueToday, overdue };
}

async function loadEmWidget(user: SessionUser): Promise<EmWidgetData> {
  const payload = await getEmReadyPayload(user);
  const people = [...payload.personKra]
    .filter((row) => row.totalDeficitPct > 0)
    .sort((a, b) => b.totalDeficitPct - a.totalDeficitPct)
    .slice(0, 3)
    .map((row) => ({ name: row.owner, deficitPct: row.totalDeficitPct }));

  return { people, exceptions: payload.exceptions.length };
}

/**
 * All widget queries in one Promise.all, tenant-scoped via the session user.
 * Module + role gating mirrors src/lib/workspace-navigation.ts: managers see
 * org-wide numbers, staff see their own queue.
 */
export async function getWidgetDashboardData(
  user: SessionUser,
): Promise<WidgetDashboardData> {
  const organizationId = user.organizationId;
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const personalUserId = isManager ? undefined : user.id;

  const fmsEnabled = hasWorkspaceModule(user, "FMS");
  const imsEnabled = hasWorkspaceModule(user, "IMS") && isManager;
  const tasksEnabled = hasWorkspaceModule(user, "TASKS");
  const emEnabled = hasWorkspaceModule(user, "REPORTS") && isManager;
  const hrEnabled = hasWorkspaceModule(user, "HR") && fmsEnabled && isManager;

  const recruitmentKeywords = RECRUITMENT_FMS_FLOW.matchKeywords;

  const emPromise = emEnabled
    ? Promise.race([
        loadEmWidget(user).catch((error) => {
          console.error("[widgets] em widget failed", error);
          return null;
        }),
        // Cap EM so a slow scoreboard never blanks the whole home pane.
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 1200);
        }),
      ])
    : Promise.resolve(null);

  const [leads, salesOrders, fms, ims, checklists, em, recruitment] =
    await Promise.all([
      fmsEnabled
        ? loadLeadsWidget(organizationId, personalUserId)
        : Promise.resolve(null),
      fmsEnabled && isManager
        ? getSalesOrderWidgetStats(organizationId)
        : Promise.resolve(null),
      fmsEnabled
        ? getFmsWidgetCounts(organizationId, personalUserId)
        : Promise.resolve(null),
      imsEnabled ? loadImsWidget(organizationId) : Promise.resolve(null),
      tasksEnabled
        ? loadChecklistsWidget(organizationId, personalUserId)
        : Promise.resolve(null),
      emPromise,
      hrEnabled
        ? getRecruitmentFmsWidgetCounts(organizationId, recruitmentKeywords)
        : Promise.resolve(null),
    ]);

  return {
    scope: isManager ? "organization" : "personal",
    leads,
    salesOrders,
    fms,
    ims,
    checklists,
    em,
    recruitment,
  };
}
