import { prisma } from "@/lib/db";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";
import {
  isPcWorkInPeriod,
  type PcPeriod,
} from "@/lib/checklists/pc-period";

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
  lastFollowedAt?: Date | null;
  pcJobDoneAt?: Date | null;
  templateId?: string | null;
  notes?: string | null;
  proofFileName?: string | null;
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

function toChecklistPcWorkItem(run: {
  id: string;
  plannedAt: Date;
  status: string;
  notes?: string | null;
  proofFileName?: string | null;
  assigneeUserId: string;
  template: { id?: string; title: string; team: string };
  assignee: { name: string | null; email: string };
}): PcWorkItem {
  return {
    id: run.id,
    kind: "CHECKLIST",
    title: run.template.title,
    subtitle: run.template.team,
    owner: ownerLabel(run.assignee.name, run.assignee.email),
    ownerId: run.assigneeUserId,
    pcUserIds: [],
    eaUserId: null,
    dueLabel: formatDue(run.plannedAt),
    dueAt: run.plannedAt,
    status: run.status,
    overdue: run.status === "OVERDUE" || run.plannedAt.getTime() < Date.now(),
    href: checklistTeamHref(run.template.team),
    completable: true,
    templateId: run.template.id ?? null,
    notes: run.notes ?? null,
    proofFileName: run.proofFileName ?? null,
  };
}

/** PC portal — checklists, EA/delegation, and FMS stops the PC must chase. */
export async function listMyPcFollowups(
  organizationId: string,
  assigneeUserId: string,
  scope: PcPeriod = "all",
) {
  const [checklists, eaTasks, fmsSteps] = await Promise.all([
    listMyChecklistPcWork(organizationId, assigneeUserId)
      .then((rows) =>
        rows.map((row) =>
          toChecklistPcWorkItem({
            id: row.id,
            plannedAt: new Date(row.plannedAt),
            status: row.status,
            assigneeUserId,
            template: { title: row.template.title, team: row.template.team },
            assignee: row.assignee,
          }),
        ),
      )
      .catch((error) => {
        console.error("[pc-work] checklist load failed", error);
        return [] as PcWorkItem[];
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

  return filterPcFollowupsByScope({ checklists, eaTasks, fmsSteps }, scope);
}

export async function listOrgPcFollowupsMonitor(
  organizationId: string,
  scope: PcPeriod = "all",
) {
  const [checklists, eaTasks, fmsSteps] = await Promise.all([
    prisma.checklistOccurrence
      .findMany({
        where: {
          organizationId,
          status: { in: ["PENDING", "OVERDUE"] },
        },
        include: {
          template: { select: { id: true, title: true, team: true } },
          assignee: { select: { name: true, email: true } },
        },
        orderBy: [{ status: "desc" }, { plannedAt: "asc" }],
        take: 200,
      })
      .then((rows) => rows.map(toChecklistPcWorkItem))
      .catch((error) => {
        console.error("[pc-work] org checklist monitor failed", error);
        return [] as PcWorkItem[];
      }),
    listOrgEaPcMonitor(organizationId),
    listOrgFmsPcMonitor(organizationId),
  ]);

  const filtered = filterPcFollowupsByScope({ checklists, eaTasks, fmsSteps }, scope);
  return {
    ...filtered,
    total:
      filtered.checklists.length + filtered.eaTasks.length + filtered.fmsSteps.length,
  };
}

export function filterPcFollowupsByScope(
  items: { checklists: PcWorkItem[]; eaTasks: PcWorkItem[]; fmsSteps: PcWorkItem[] },
  scope: PcPeriod,
) {
  if (scope === "all") {
    return items;
  }
  return {
    checklists: items.checklists.filter((row) => isPcWorkInPeriod(row, scope)),
    eaTasks: items.eaTasks.filter((row) => isPcWorkInPeriod(row, scope)),
    fmsSteps: items.fmsSteps.filter((row) => isPcWorkInPeriod(row, scope)),
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
    dueAt: run.plannedAt,
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

export function pcWorkHrefKey(item: Pick<PcWorkItem, "kind" | "id">) {
  return `/app/pc/job/${item.kind}/${item.id}`;
}

export async function enrichPcChaseStatus(
  organizationId: string,
  items: PcWorkItem[],
): Promise<PcWorkItem[]> {
  if (items.length === 0) {
    return items;
  }
  const hrefs = items.map(pcWorkHrefKey);
  const logs = await prisma.userAppNotification.findMany({
    where: {
      organizationId,
      kind: { in: ["PC_FOLLOW_UP", "PC_JOB_DONE"] },
      href: { in: hrefs },
    },
    select: { kind: true, href: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const followed = new Map<string, Date>();
  const done = new Map<string, Date>();
  for (const log of logs) {
    if (!log.href) continue;
    if (log.kind === "PC_FOLLOW_UP" && !followed.has(log.href)) {
      followed.set(log.href, log.createdAt);
    }
    if (log.kind === "PC_JOB_DONE" && !done.has(log.href)) {
      done.set(log.href, log.createdAt);
    }
  }
  return items.map((item) => {
    const key = pcWorkHrefKey(item);
    return {
      ...item,
      lastFollowedAt: followed.get(key) ?? null,
      pcJobDoneAt: done.get(key) ?? null,
    };
  });
}
