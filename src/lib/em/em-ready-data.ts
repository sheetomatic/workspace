import type { SessionUser } from "@/lib/auth";
import { getFmsOpsPage, getFmsPipelineCounts, listFmsInstancesPage } from "@/lib/fms/queries";
import { formatDelayLabel, liveDelayMinutes } from "@/lib/fms/step-display";
import {
  buildFmsMisRows,
  buildTaskMisRows,
  categorySummary,
  formatDeficitPct,
  type MisDetailRow,
} from "@/lib/mis/reports-data";
import { listChecklistOccurrencesForMis } from "@/lib/checklists/queries";
import { buildChecklistMisRows } from "@/lib/checklists/mis";
import { buildPcMisDetailRows } from "@/lib/checklists/pc-mis";
import { listDelegatedTasks } from "@/lib/tasks";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import {
  fmsJobFallsInEmPeriod,
  fmsStepFallsInEmPeriod,
  parseEmPeriodParams,
  taskFallsInEmPeriod,
  type EmPeriodRange,
  type EmPeriodSearchParams,
} from "@/lib/em/em-period";

export type EmExceptionRow = {
  id: string;
  kind: "task" | "fms" | "checklist";
  title: string;
  owner: string;
  detail: string;
  href: string;
};

export type EmPersonKraRow = {
  owner: string;
  taskTotal: number;
  taskDelayed: number;
  taskDeficitPct: number;
  fmsTotal: number;
  fmsDelayed: number;
  fmsDeficitPct: number;
  checklistTotal: number;
  checklistDelayed: number;
  checklistDeficitPct: number;
  totalDeficitPct: number;
};

export type EmReadyPayload = {
  generatedAt: string;
  period: EmPeriodRange;
  tasksEnabled: boolean;
  fmsEnabled: boolean;
  checklistsEnabled: boolean;
  tiles: {
    overdueTasks: number;
    openTasks: number;
    overdueFmsStops: number;
    unassignedFmsStops: number;
    activePipelines: number;
    delayedPipelines: number;
  };
  taskSummary: ReturnType<typeof categorySummary> | null;
  fmsSummary: ReturnType<typeof categorySummary> | null;
  checklistSummary: ReturnType<typeof categorySummary> | null;
  personKra: EmPersonKraRow[];
  exceptions: EmExceptionRow[];
};

function deficitFromRows(rows: MisDetailRow[]) {
  if (rows.length === 0) {
    return 0;
  }
  const avg =
    rows.reduce((sum, row) => sum + row.score, 0) / Math.max(rows.length, 1);
  return Math.round(Math.max(0, 100 - avg));
}

function buildPersonKra(
  taskRows: MisDetailRow[],
  fmsRows: MisDetailRow[],
  checklistRows: ReturnType<typeof buildChecklistMisRows>,
) {
  const owners = new Set([
    ...taskRows.map((row) => row.owner),
    ...fmsRows.map((row) => row.owner),
    ...checklistRows.map((row) => row.owner),
  ]);

  const rows: EmPersonKraRow[] = [];

  for (const owner of owners) {
    if (owner === "Unassigned") {
      continue;
    }
    const tasks = taskRows.filter((row) => row.owner === owner);
    const fms = fmsRows.filter((row) => row.owner === owner);
    const checklists = checklistRows.filter((row) => row.owner === owner);
    const taskDeficitPct = deficitFromRows(tasks);
    const fmsDeficitPct = deficitFromRows(fms);
    const checklistDeficitPct =
      checklists.length > 0
        ? Math.round(
            Math.max(
              0,
              100 -
                checklists.reduce((sum, row) => sum + row.score, 0) /
                  checklists.length,
            ),
          )
        : 0;
    const combined = [
      ...tasks,
      ...fms,
      ...checklists.map((row) => ({
        id: row.id,
        category: "Task" as const,
        title: row.title,
        owner: row.owner,
        status: row.status,
        score: row.score,
        delayed: row.delayed,
        href: row.href,
      })),
    ];
    const totalDeficitPct = deficitFromRows(combined);

    rows.push({
      owner,
      taskTotal: tasks.length,
      taskDelayed: tasks.filter((row) => row.delayed).length,
      taskDeficitPct,
      fmsTotal: fms.length,
      fmsDelayed: fms.filter((row) => row.delayed).length,
      fmsDeficitPct,
      checklistTotal: checklists.length,
      checklistDelayed: checklists.filter((row) => row.delayed).length,
      checklistDeficitPct,
      totalDeficitPct,
    });
  }

  return rows.sort((a, b) => b.totalDeficitPct - a.totalDeficitPct);
}

function buildExceptions(
  taskRows: MisDetailRow[],
  fmsOverdue: Awaited<ReturnType<typeof getFmsOpsPage>>["overdue"],
  checklistRows: ReturnType<typeof buildChecklistMisRows>,
) {
  const taskExceptions: EmExceptionRow[] = taskRows
    .filter((row) => row.delayed)
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      kind: "task" as const,
      title: row.title,
      owner: row.owner,
      detail: row.status,
      href: row.href,
    }));

  const fmsExceptions: EmExceptionRow[] = fmsOverdue.slice(0, 8).map((step) => ({
    id: step.id,
    kind: "fms" as const,
    title: step.instance.referenceLabel ?? step.instance.template.name,
    owner:
      step.owner?.name ??
      step.owner?.email.split("@")[0] ??
      "Unassigned",
    detail: `${step.step.stepName} - ${
      formatDelayLabel(
        liveDelayMinutes(step.plannedAt, step.actualAt, step.delayMinutes),
      ) ?? "Overdue"
    }`,
    href: `/app/fms/instances/${step.instanceId}?from=ops&action=complete`,
  }));

  const checklistExceptions: EmExceptionRow[] = checklistRows
    .filter((row) => row.delayed)
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      kind: "checklist" as const,
      title: row.title,
      owner: row.owner,
      detail: `${row.team} - ${row.status}`,
      href: row.href,
    }));

  return [...fmsExceptions, ...checklistExceptions, ...taskExceptions].slice(0, 14);
}

export async function getEmReadyPayload(
  user: SessionUser,
  periodInput?: EmPeriodSearchParams | EmPeriodRange,
): Promise<EmReadyPayload> {
  const period =
    periodInput && "start" in periodInput
      ? periodInput
      : parseEmPeriodParams(periodInput ?? {});
  const tasksEnabled = hasWorkspaceModule(user, "TASKS");
  const fmsEnabled = hasWorkspaceModule(user, "FMS");
  const checklistsEnabled = tasksEnabled;

  const [taskPage, fmsPage, fmsOps, pipelineCounts, checklistOccurrences] =
    await Promise.all([
    tasksEnabled
      ? listDelegatedTasks(user, { includeCompleted: false }, { page: 1, pageSize: 200 })
      : Promise.resolve({ items: [] }),
    fmsEnabled
      ? listFmsInstancesPage(user.organizationId, {
          status: "ACTIVE",
          page: 1,
          pageSize: 200,
        })
      : Promise.resolve({ items: [] }),
    fmsEnabled
      ? getFmsOpsPage(user.organizationId, { overduePage: 1, unassignedPage: 1 })
      : Promise.resolve({
          activeCount: 0,
          overdueTotal: 0,
          unassignedTotal: 0,
          overdue: [],
          unassigned: [],
        }),
    fmsEnabled
      ? getFmsPipelineCounts(user.organizationId)
      : Promise.resolve({
          active: 0,
          onTrack: 0,
          delayed: 0,
          pending: 0,
        }),
    checklistsEnabled
      ? listChecklistOccurrencesForMis(user.organizationId, {
          start: period.start,
          end: period.end,
        })
      : Promise.resolve([]),
  ]);

  const taskRows = buildTaskMisRows(
    taskPage.items.filter((task) => taskFallsInEmPeriod(task, period)),
  );
  const fmsRows = buildFmsMisRows(
    fmsPage.items.filter((job) => fmsJobFallsInEmPeriod(job, period)),
  );
  const filteredOverdue = fmsOps.overdue.filter((step) =>
    fmsStepFallsInEmPeriod(step, period),
  );
  const filteredUnassigned = fmsOps.unassigned.filter((step) =>
    fmsStepFallsInEmPeriod(step, period),
  );
  const checklistRows = buildChecklistMisRows(checklistOccurrences);
  const overdueTasks = taskRows.filter((row) => row.delayed).length;
  const overdueChecklists = checklistRows.filter((row) => row.delayed).length;

  return {
    generatedAt: new Date().toISOString(),
    period,
    tasksEnabled,
    fmsEnabled,
    checklistsEnabled,
    tiles: {
      overdueTasks,
      openTasks: taskRows.length,
      overdueFmsStops: filteredOverdue.length,
      unassignedFmsStops: filteredUnassigned.length,
      activePipelines: pipelineCounts.active,
      delayedPipelines: pipelineCounts.delayed,
    },
    taskSummary: tasksEnabled ? categorySummary("Task", taskRows) : null,
    fmsSummary: fmsEnabled ? categorySummary("FMS", fmsRows) : null,
    checklistSummary: checklistsEnabled
      ? categorySummary("PC", buildPcMisDetailRows(checklistOccurrences))
      : null,
    personKra: buildPersonKra(taskRows, fmsRows, checklistRows),
    exceptions: buildExceptions(taskRows, filteredOverdue, checklistRows),
  };
}

export { formatDeficitPct };
