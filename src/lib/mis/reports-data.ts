import { fmsJobMisScore, taskMisScore } from "@/lib/mis/score";
import type { listFmsInstancesPage } from "@/lib/fms/queries";
import type { listDelegatedTasks } from "@/lib/tasks";

export type MisCategory = "Task" | "FMS";

export type MisDetailRow = {
  id: string;
  category: MisCategory;
  title: string;
  owner: string;
  status: string;
  score: number;
  delayed: boolean;
  href: string;
};

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
  options: { category?: string; metric?: string },
) {
  const selectedCategory = options.category?.toLowerCase();
  const selectedMetric = options.metric ?? "all";

  return rows.filter((row) => {
    if (selectedCategory && row.category.toLowerCase() !== selectedCategory) {
      return false;
    }
    if (selectedMetric === "delayed") {
      return row.delayed;
    }
    if (selectedMetric === "onTime") {
      return !row.delayed;
    }
    if (selectedMetric === "deficit") {
      return row.score < 100;
    }
    return true;
  });
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
