import { fmsJobMisScore, taskMisScore } from "@/lib/mis/score";
import type { listFmsInstancesPage } from "@/lib/fms/queries";
import type { listDelegatedTasks } from "@/lib/tasks";

export type MisCategory = "Task" | "FMS" | "PC";

export type MisDetailRow = {
  id: string;
  category: MisCategory;
  title: string;
  owner: string;
  ownerId: string | null;
  status: string;
  score: number;
  delayed: boolean;
  href: string;
};

export type MisDoerOption = {
  id: string;
  label: string;
};

export const MIS_UNASSIGNED_DOER = "__unassigned__";

export type MisCategorySummary = {
  category: MisCategory;
  total: number;
  onTime: number;
  delayed: number;
  delayedPct: number;
  avgScore: number;
  deficit: number;
  deficitPct: number;
};

type TaskItem = Awaited<
  ReturnType<typeof listDelegatedTasks>
>["items"][number];

type FmsJobItem = Awaited<
  ReturnType<typeof listFmsInstancesPage>
>["items"][number];

export function pct(part: number, total: number) {
  if (total === 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export function categorySummary(
  category: MisCategory,
  rows: MisDetailRow[],
): MisCategorySummary {
  const total = rows.length;
  const delayed = rows.filter((row) => row.delayed).length;
  const onTime = total - delayed;
  const avgScore =
    total > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / total)
      : 100;
  const deficit = Math.max(0, 100 - avgScore);

  return {
    category,
    total,
    onTime,
    delayed,
    delayedPct: pct(delayed, total),
    avgScore,
    deficit,
    deficitPct: deficit,
  };
}

export function metricHref(
  basePath: string,
  category: string,
  metric: string,
) {
  const params = new URLSearchParams({
    category: category.toLowerCase(),
    metric,
  });
  return `${basePath}?${params.toString()}`;
}

export function filterMisRows(
  rows: MisDetailRow[],
  options: { category?: string; metric?: string; doer?: string },
) {
  const selectedCategory = options.category?.toLowerCase();
  const selectedMetric = options.metric ?? "all";
  const selectedDoer = options.doer;

  return rows.filter((row) => {
    if (selectedCategory && row.category.toLowerCase() !== selectedCategory) {
      return false;
    }
    if (selectedMetric === "delayed") {
      if (!row.delayed) {
        return false;
      }
    } else if (selectedMetric === "onTime") {
      if (row.delayed) {
        return false;
      }
    } else if (selectedMetric === "deficit") {
      if (row.score >= 100) {
        return false;
      }
    }
    if (selectedDoer && selectedDoer !== "all") {
      const rowDoerId = row.ownerId ?? MIS_UNASSIGNED_DOER;
      if (rowDoerId !== selectedDoer) {
        return false;
      }
    }
    return true;
  });
}

export function misDoerOptions(rows: MisDetailRow[]): MisDoerOption[] {
  const map = new Map<string, string>();

  for (const row of rows) {
    const id = row.ownerId ?? MIS_UNASSIGNED_DOER;
    const label = row.ownerId ? row.owner : "Unassigned";
    map.set(id, label);
  }

  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => {
      if (a.id === MIS_UNASSIGNED_DOER) {
        return 1;
      }
      if (b.id === MIS_UNASSIGNED_DOER) {
        return -1;
      }
      return a.label.localeCompare(b.label);
    });
}

export function hasMisActiveFilters(options: {
  category?: string;
  metric?: string;
  doer?: string;
}) {
  return Boolean(
    options.category ||
      (options.metric && options.metric !== "all") ||
      (options.doer && options.doer !== "all"),
  );
}

export function buildTaskMisRows(tasks: TaskItem[]): MisDetailRow[] {
  return tasks.map((task) => {
    const score = taskMisScore({
      status: task.status,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
    });
    const owner = task.assignee.name ?? task.assignee.email.split("@")[0];

    return {
      id: task.id,
      category: "Task",
      title: task.title,
      owner,
      ownerId: task.assignee.id,
      status: task.status.replaceAll("_", " "),
      score: score.score,
      delayed: score.label === "Late" || score.label === "Overdue",
      href: "/app/tasks",
    };
  });
}

export function buildFmsMisRows(jobs: FmsJobItem[]): MisDetailRow[] {
  return jobs
    .filter((job) => job.status !== "CANCELLED")
    .map((job) => {
      const score = fmsJobMisScore(job.stepStates);
      const current = job.stepStates.find((step) => step.status === "IN_PROGRESS");
      const delayed = job.stepStates.some((step) => {
        if (step.delayMinutes && step.delayMinutes > 0) {
          return true;
        }
        return current?.id === step.id && score.label === "Overdue";
      });

      return {
        id: job.id,
        category: "FMS",
        title: job.referenceLabel ?? job.template.name,
        owner:
          current?.owner?.name ??
          current?.owner?.email.split("@")[0] ??
          "Unassigned",
        ownerId: current?.owner?.id ?? null,
        status: current?.step.stepName ?? job.status,
        score: score.score,
        delayed,
        href: `/app/fms/instances/${job.id}`,
      };
    });
}

export function formatDeficitPct(deficitPct: number) {
  if (deficitPct <= 0) {
    return "0%";
  }
  return `-${deficitPct}%`;
}
