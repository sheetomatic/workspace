import { prisma } from "@/lib/db";
import { isTaskDueToday } from "@/lib/task-due-urgency";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";

export type PcWorkKind = "CHECKLIST" | "EA_TASK" | "FMS_STEP";

export type PcWorkItem = {
  id: string;
  kind: PcWorkKind;
  title: string;
  subtitle: string;
  owner: string;
  ownerId: string | null;
  pcUserIds: string[];
  eaUserId: string | null;
  dueLabel: string;
  dueAt?: Date | null;
  status: string;
  overdue: boolean;
  href: string;
  completable: boolean;
};

function ownerLabel(name: string | null, email: string) {
  return name ?? email.split("@")[0];
}

function checklistTeamHref(team: string) {
  if (team === "ACCOUNTS") return "/app/checklists/accounts";
  if (team === "HR") return "/app/checklists/hr";
  if (team === "MAINTENANCE") return "/app/checklists/maintenance";
  return "/app/checklists/accounts";
}

function formatDue(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function parsePcUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

const fmsPcStepSelect = {
  id: true,
  instanceId: true,
  ownerUserId: true,
  plannedAt: true,
  status: true,
  step: { select: { stepName: true } },
  owner: { select: { name: true, email: true } },
  instance: {
    select: {
      referenceLabel: true,
      template: { select: { name: true, pcUserIds: true, eaUserId: true } },
    },
  },
} as const;

function toFmsPcWorkItem(
  step: {
    id: string;
    instanceId: string;
    ownerUserId: string | null;
    plannedAt: Date | null;
    status: string;
    step: { stepName: string };
    owner: { name: string | null; email: string } | null;
    instance: {
      referenceLabel: string | null;
      template: { name: string; pcUserIds: unknown; eaUserId: string | null };
    };
  },
  ownerFallback: string,
): PcWorkItem {
  const now = Date.now();
  return {
    id: step.id,
    kind: "FMS_STEP",
    title: step.instance.referenceLabel ?? step.instance.template.name,
    subtitle: step.step.stepName,
    owner: ownerLabel(step.owner?.name ?? null, step.owner?.email ?? ownerFallback),
    ownerId: step.ownerUserId,
    pcUserIds: parsePcUserIds(step.instance.template.pcUserIds),
    eaUserId: step.instance.template.eaUserId,
    dueLabel: step.plannedAt ? formatDue(step.plannedAt) : "No SLA",
    dueAt: step.plannedAt,
    status: step.status.replaceAll("_", " "),
    overdue: step.plannedAt ? step.plannedAt.getTime() < now : false,
    href: `/app/fms/instances/${step.instanceId}?from=ops&action=complete`,
    completable: false,
  };
}

export type ChecklistRunCard = {
  id: string;
  plannedAt: string;
  status: string;
  notes: string | null;
  template: {
    title: string;
    instructions: string | null;
    team: string;
    frequency: string;
  };
  assignee: {
    name: string | null;
    email: string;
  };
};

export async function listMyChecklistPcWork(
  organizationId: string,
  assigneeUserId: string,
): Promise<ChecklistRunCard[]> {
  const rows = await prisma.checklistOccurrence.findMany({
    where: {
      organizationId,
      assigneeUserId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    select: {
      id: true,
      plannedAt: true,
      status: true,
      notes: true,
      template: {
        select: {
          title: true,
          instructions: true,
          team: true,
          frequency: true,
        },
      },
      assignee: { select: { name: true, email: true } },
    },
    orderBy: [{ status: "desc" }, { plannedAt: "asc" }],
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    plannedAt: row.plannedAt.toISOString(),
    status: row.status,
    notes: row.notes,
    template: row.template,
    assignee: row.assignee,
  }));
}

export async function listMyEaPcWork(organizationId: string, assigneeUserId: string) {
  const tasks = await prisma.delegatedTask.findMany({
    where: {
      organizationId,
      assigneeUserId,
      status: { in: ACTIVE_TASK_STATUSES },
    },
    include: {
      assignee: { select: { name: true, email: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 50,
  });

  const now = Date.now();
  return tasks.map((task) => ({
    id: task.id,
    kind: "EA_TASK" as const,
    title: task.title,
    subtitle: "EA / Task Delegation",
    owner: ownerLabel(task.assignee.name, task.assignee.email),
    ownerId: task.assigneeUserId,
    pcUserIds: [] as string[],
    eaUserId: task.assigneeUserId,
    dueLabel: formatDue(task.dueAt),
    dueAt: task.dueAt,
    status: task.status.replaceAll("_", " "),
    overdue: task.dueAt.getTime() < now,
    href: "/app/tasks/today",
    completable: false,
  }));
}

export async function listMyFmsPcWork(organizationId: string, assigneeUserId: string) {
  const steps = await prisma.fmsStepState.findMany({
    where: {
      ownerUserId: assigneeUserId,
      status: "IN_PROGRESS",
      instance: { organizationId, status: "ACTIVE" },
    },
    select: fmsPcStepSelect,
    orderBy: { plannedAt: "asc" },
    take: 50,
  });

  return steps.map((step) => toFmsPcWorkItem(step, ""));
}

export async function listMyPcWork(organizationId: string, assigneeUserId: string) {
  const [checklists, eaTasks, fmsSteps] = await Promise.all([
    listMyChecklistPcWork(organizationId, assigneeUserId).catch((error) => {
      console.error("[pc-work] checklist load failed", error);
      return [];
    }),
    listMyEaPcWork(organizationId, assigneeUserId).catch((error) => {
      console.error("[pc-work] EA load failed", error);
      return [];
    }),
    listMyFmsPcWork(organizationId, assigneeUserId).catch((error) => {
      console.error("[pc-work] FMS load failed", error);
      return [];
    }),
  ]);

  return { checklists, eaTasks, fmsSteps };
}

function isPcFollowupDueToday(item: PcWorkItem) {
  if (item.overdue) {
    return true;
  }
  if (!item.dueAt) {
    return false;
  }
  return isTaskDueToday(item.dueAt);
}

/** PC portal — EA tasks and FMS stops only (checklists live under Check List module). */
export async function listMyPcFollowups(
  organizationId: string,
  assigneeUserId: string,
  scope: "today" | "all" = "all",
) {
  const [eaTasks, fmsSteps] = await Promise.all([
    listMyEaPcWork(organizationId, assigneeUserId).catch((error) => {
      console.error("[pc-work] EA load failed", error);
      return [];
    }),
    listMyFmsPcWork(organizationId, assigneeUserId).catch((error) => {
      console.error("[pc-work] FMS load failed", error);
      return [];
    }),
  ]);

  if (scope === "all") {
    return { eaTasks, fmsSteps };
  }

  return {
    eaTasks: eaTasks.filter(isPcFollowupDueToday),
    fmsSteps: fmsSteps.filter(isPcFollowupDueToday),
  };
}

export async function listOrgPcFollowupsMonitor(organizationId: string) {
  const [eaTasks, fmsSteps] = await Promise.all([
    listOrgEaPcMonitor(organizationId),
    listOrgFmsPcMonitor(organizationId),
  ]);

  return { eaTasks, fmsSteps, total: eaTasks.length + fmsSteps.length };
}

export function filterPcFollowupsByScope(
  items: { eaTasks: PcWorkItem[]; fmsSteps: PcWorkItem[] },
  scope: "today" | "all",
) {
  if (scope === "all") {
    return items;
  }
  return {
    eaTasks: items.eaTasks.filter(isPcFollowupDueToday),
    fmsSteps: items.fmsSteps.filter(isPcFollowupDueToday),
  };
}

export async function listOrgEaPcMonitor(organizationId: string) {
  const tasks = await prisma.delegatedTask.findMany({
    where: {
      organizationId,
      status: { in: ACTIVE_TASK_STATUSES },
    },
    include: {
      assignee: { select: { name: true, email: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 100,
  });

  const now = Date.now();
  return tasks.map((task) => ({
    id: task.id,
    kind: "EA_TASK" as const,
    title: task.title,
    subtitle: "EA / Task Delegation",
    owner: ownerLabel(task.assignee.name, task.assignee.email),
    ownerId: task.assigneeUserId,
    pcUserIds: [] as string[],
    eaUserId: task.assigneeUserId,
    dueLabel: formatDue(task.dueAt),
    dueAt: task.dueAt,
    status: task.status.replaceAll("_", " "),
    overdue: task.dueAt.getTime() < now,
    href: "/app/tasks",
    completable: false,
  }));
}

export async function listOrgFmsPcMonitor(organizationId: string) {
  const inProgress = await prisma.fmsStepState.findMany({
    where: {
      status: "IN_PROGRESS",
      instance: { organizationId, status: "ACTIVE" },
    },
    select: fmsPcStepSelect,
    orderBy: { plannedAt: "asc" },
    take: 100,
  });

  return inProgress.map((step) => toFmsPcWorkItem(step, "Unassigned"));
}

export async function listOrgPcMonitor(organizationId: string) {
  const [checklistRuns, eaTasks, fmsSteps] = await Promise.all([
    prisma.checklistOccurrence.findMany({
      where: {
        organizationId,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      include: {
        template: { select: { title: true, team: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: [{ status: "desc" }, { plannedAt: "asc" }],
      take: 100,
    }),
    listOrgEaPcMonitor(organizationId).catch((error) => {
      console.error("[pc-work] org EA monitor failed", error);
      return [];
    }),
    listOrgFmsPcMonitor(organizationId).catch((error) => {
      console.error("[pc-work] org FMS monitor failed", error);
      return [];
    }),
  ]);

  const checklistItems: PcWorkItem[] = checklistRuns.map((run) => ({
    id: run.id,
    kind: "CHECKLIST",
    title: run.template.title,
    subtitle: run.template.team,
    owner: ownerLabel(run.assignee.name, run.assignee.email),
    ownerId: run.assigneeUserId,
    pcUserIds: [run.assigneeUserId],
    eaUserId: null,
    dueLabel: formatDue(run.plannedAt),
    status: run.status,
    overdue: run.status === "OVERDUE",
    href: checklistTeamHref(run.template.team),
    completable: true,
  }));

  return {
    checklists: checklistItems,
    eaTasks,
    fmsSteps,
    total: checklistItems.length + eaTasks.length + fmsSteps.length,
  };
}
