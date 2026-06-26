import { prisma } from "@/lib/db";
import { getFmsOpsPage } from "@/lib/fms/queries";
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
  status: string;
  overdue: boolean;
  href: string;
  /** Checklist occurrences can be marked done on the PC board. */
  completable: boolean;
};

function ownerLabel(name: string | null, email: string) {
  return name ?? email.split("@")[0];
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

export async function listMyChecklistPcWork(
  organizationId: string,
  assigneeUserId: string,
) {
  const rows = await prisma.checklistOccurrence.findMany({
    where: {
      organizationId,
      assigneeUserId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      template: {
        include: { references: { orderBy: { sortOrder: "asc" } } },
      },
      assignee: { select: { name: true, email: true } },
    },
    orderBy: [{ status: "desc" }, { plannedAt: "asc" }],
    take: 100,
  });

  return rows;
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
    status: task.status.replaceAll("_", " "),
    overdue: task.dueAt.getTime() < now,
    href: "/app/tasks/my-work",
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
    include: {
      step: true,
      owner: { select: { name: true, email: true } },
      instance: {
        include: {
          template: { select: { name: true, pcUserIds: true, eaUserId: true } },
        },
      },
    },
    orderBy: { plannedAt: "asc" },
    take: 50,
  });

  const now = Date.now();
  return steps.map((step) => ({
    id: step.id,
    kind: "FMS_STEP" as const,
    title: step.instance.referenceLabel ?? step.instance.template.name,
    subtitle: step.step.stepName,
    owner: ownerLabel(step.owner?.name ?? null, step.owner?.email ?? ""),
    ownerId: step.ownerUserId,
    pcUserIds: parsePcUserIds(step.instance.template.pcUserIds),
    eaUserId: step.instance.template.eaUserId,
    dueLabel: step.plannedAt ? formatDue(step.plannedAt) : "No SLA",
    status: step.status.replaceAll("_", " "),
    overdue: step.plannedAt ? step.plannedAt.getTime() < now : false,
    href: `/app/fms/instances/${step.instanceId}?from=ops&action=complete`,
    completable: false,
  }));
}

export async function listMyPcWork(organizationId: string, assigneeUserId: string) {
  const [checklists, eaTasks, fmsSteps] = await Promise.all([
    listMyChecklistPcWork(organizationId, assigneeUserId),
    listMyEaPcWork(organizationId, assigneeUserId),
    listMyFmsPcWork(organizationId, assigneeUserId),
  ]);

  return { checklists, eaTasks, fmsSteps };
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
    status: task.status.replaceAll("_", " "),
    overdue: task.dueAt.getTime() < now,
    href: "/app/tasks",
    completable: false,
  }));
}

export async function listOrgFmsPcMonitor(organizationId: string) {
  const ops = await getFmsOpsPage(organizationId, { overduePage: 1, unassignedPage: 1 });
  const now = Date.now();

  const inProgress = await prisma.fmsStepState.findMany({
    where: {
      status: "IN_PROGRESS",
      ownerUserId: { not: null },
      instance: { organizationId, status: "ACTIVE" },
    },
    include: {
      step: true,
      owner: { select: { name: true, email: true } },
      instance: {
        include: {
          template: { select: { name: true, pcUserIds: true, eaUserId: true } },
        },
      },
    },
    orderBy: { plannedAt: "asc" },
    take: 100,
  });

  const seen = new Set<string>();
  const items: PcWorkItem[] = [];

  for (const step of [...ops.overdue, ...inProgress]) {
    if (seen.has(step.id)) {
      continue;
    }
    seen.add(step.id);
    items.push({
      id: step.id,
      kind: "FMS_STEP",
      title: step.instance.referenceLabel ?? step.instance.template.name,
      subtitle: step.step.stepName,
      owner: ownerLabel(step.owner?.name ?? null, step.owner?.email ?? "Unassigned"),
      ownerId: step.ownerUserId,
      pcUserIds: parsePcUserIds(step.instance.template.pcUserIds),
      eaUserId: step.instance.template.eaUserId,
      dueLabel: step.plannedAt ? formatDue(step.plannedAt) : "No SLA",
      status: step.status.replaceAll("_", " "),
      overdue: step.plannedAt ? step.plannedAt.getTime() < now : false,
      href: `/app/fms/instances/${step.instanceId}?from=ops&action=complete`,
      completable: false,
    });
  }

  return items;
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
    listOrgEaPcMonitor(organizationId),
    listOrgFmsPcMonitor(organizationId),
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
    href: "/app/checklists/my-tasks",
    completable: true,
  }));

  return {
    checklists: checklistItems,
    eaTasks,
    fmsSteps,
    total: checklistItems.length + eaTasks.length + fmsSteps.length,
  };
}
