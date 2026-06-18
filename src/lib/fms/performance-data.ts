import type { FmsStepStatus } from "@prisma/client";
import { isStepOverdue } from "@/lib/fms/step-display";

export type FmsPerformanceFilters = {
  fms?: string;
  doer?: string;
  due?: string;
};

export type PerformanceStepRow = {
  templateId: string;
  templateName: string;
  instanceId: string;
  status: FmsStepStatus;
  plannedAt: string | null;
  actualAt: string | null;
  delayMinutes: number | null;
  ownerId: string | null;
  ownerName: string | null;
  isOverdue: boolean;
  isInProgress: boolean;
};

export type FmsWiseRow = {
  id: string;
  name: string;
  activeLeads: number;
  inProgress: number;
  onTrack: number;
  delayed: number;
};

export type DoerWiseRow = {
  id: string;
  name: string;
  active: number;
  delayed: number;
  onTrack: number;
};

export type DueWiseRow = {
  key: string;
  label: string;
  count: number;
  tone: "overdue" | "today" | "soon" | "later" | "none";
};

export type PerformancePayload = {
  workflows: { id: string; name: string }[];
  doers: { id: string; name: string }[];
  kpis: {
    activeWorkflows: number;
    activeLeads: number;
    inProgress: number;
    onTrack: number;
    delayed: number;
  };
  fmsRows: FmsWiseRow[];
  doerRows: DoerWiseRow[];
  dueRows: DueWiseRow[];
  fmsChart: { name: string; onTrack: number; delayed: number }[];
  doerChart: { name: string; active: number; delayed: number }[];
  dueChart: { label: string; count: number; fill: string }[];
  dueTable: {
    id: string;
    workflow: string;
    doer: string;
    plannedAt: string | null;
    status: FmsStepStatus;
    isOverdue: boolean;
  }[];
};

type RawTemplate = Awaited<
  ReturnType<
    typeof import("@/lib/fms/queries").getFmsPerformanceSummary
  >
>[number];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function flattenSteps(templates: RawTemplate[]): PerformanceStepRow[] {
  const rows: PerformanceStepRow[] = [];
  for (const template of templates) {
    for (const instance of template.instances) {
      for (const step of instance.stepStates) {
        const overdue = isStepOverdue(
          step.status,
          step.plannedAt,
          step.actualAt,
          step.delayMinutes,
        );
        rows.push({
          templateId: template.id,
          templateName: template.name,
          instanceId: instance.id,
          status: step.status,
          plannedAt: step.plannedAt?.toISOString() ?? null,
          actualAt: step.actualAt?.toISOString() ?? null,
          delayMinutes: step.delayMinutes,
          ownerId: step.owner?.id ?? step.ownerUserId ?? null,
          ownerName:
            step.owner?.name ?? step.owner?.email.split("@")[0] ?? null,
          isOverdue: overdue,
          isInProgress: step.status === "IN_PROGRESS",
        });
      }
    }
  }
  return rows;
}

function matchesDueFilter(
  step: PerformanceStepRow,
  due: string | undefined,
  now: Date,
) {
  if (!due || due === "all") {
    return true;
  }
  if (!step.isInProgress) {
    return due === "all";
  }
  const planned = step.plannedAt ? new Date(step.plannedAt) : null;
  if (due === "overdue") {
    return step.isOverdue;
  }
  if (due === "no_due") {
    return !planned;
  }
  if (!planned) {
    return false;
  }
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (due === "today") {
    return planned >= todayStart && planned <= todayEnd;
  }
  if (due === "this_week") {
    return planned >= todayStart && planned <= weekEnd;
  }
  return true;
}

function filterSteps(
  steps: PerformanceStepRow[],
  templates: RawTemplate[],
  filters: FmsPerformanceFilters,
) {
  const now = new Date();
  let scopedTemplates = templates;
  if (filters.fms && filters.fms !== "all") {
    scopedTemplates = templates.filter((t) => t.id === filters.fms);
  }

  const instanceIds = new Set(
    scopedTemplates.flatMap((t) => t.instances.map((i) => i.id)),
  );

  return steps.filter((step) => {
    if (!instanceIds.has(step.instanceId)) {
      return false;
    }
    if (filters.doer && filters.doer !== "all") {
      if (step.ownerId !== filters.doer) {
        return false;
      }
    }
    if (!matchesDueFilter(step, filters.due, now)) {
      return false;
    }
    return true;
  });
}

function dueBucket(step: PerformanceStepRow, now: Date): DueWiseRow {
  if (!step.isInProgress) {
    return { key: "other", label: "Not active", count: 0, tone: "none" };
  }
  if (step.isOverdue) {
    return { key: "overdue", label: "Overdue", count: 1, tone: "overdue" };
  }
  if (!step.plannedAt) {
    return { key: "no_due", label: "No due date", count: 1, tone: "none" };
  }
  const planned = new Date(step.plannedAt);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowEnd = endOfDay(
    new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
  );
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (planned >= todayStart && planned <= todayEnd) {
    return { key: "today", label: "Due today", count: 1, tone: "today" };
  }
  if (planned > todayEnd && planned <= tomorrowEnd) {
    return { key: "tomorrow", label: "Due tomorrow", count: 1, tone: "soon" };
  }
  if (planned <= weekEnd) {
    return { key: "this_week", label: "Due this week", count: 1, tone: "soon" };
  }
  return { key: "later", label: "Due later", count: 1, tone: "later" };
}

const DUE_CHART_COLORS: Record<string, string> = {
  Overdue: "#ea001e",
  "Due today": "#fe9339",
  "Due tomorrow": "#0176d3",
  "Due this week": "#2e844a",
  "Due later": "#706e6b",
  "No due date": "#c9c7c5",
};

export function buildPerformancePayload(
  templates: RawTemplate[],
  filters: FmsPerformanceFilters = {},
): PerformancePayload {
  const allSteps = flattenSteps(templates);
  const filteredSteps = filterSteps(allSteps, templates, filters);

  const scopedTemplates =
    filters.fms && filters.fms !== "all"
      ? templates.filter((t) => t.id === filters.fms)
      : templates;

  const workflows = templates.map((t) => ({ id: t.id, name: t.name }));

  const doerMap = new Map<string, string>();
  for (const step of allSteps) {
    if (step.ownerId && step.ownerName) {
      doerMap.set(step.ownerId, step.ownerName);
    }
  }
  const doers = [...doerMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const fmsRows: FmsWiseRow[] = scopedTemplates.map((template) => {
    const instanceIds = new Set(template.instances.map((i) => i.id));
    const steps = filteredSteps.filter(
      (s) => s.templateId === template.id && instanceIds.has(s.instanceId),
    );
    const inProgress = steps.filter((s) => s.isInProgress);
    const delayed = inProgress.filter((s) => s.isOverdue).length;
    return {
      id: template.id,
      name: template.name,
      activeLeads:
        filters.doer && filters.doer !== "all"
          ? new Set(
              inProgress.map((s) => s.instanceId),
            ).size
          : template.instances.length,
      inProgress: inProgress.length,
      onTrack: inProgress.length - delayed,
      delayed,
    };
  });

  const doerAgg = new Map<string, DoerWiseRow>();
  for (const step of filteredSteps) {
    if (!step.isInProgress || !step.ownerId || !step.ownerName) {
      continue;
    }
    const row = doerAgg.get(step.ownerId) ?? {
      id: step.ownerId,
      name: step.ownerName,
      active: 0,
      delayed: 0,
      onTrack: 0,
    };
    row.active += 1;
    if (step.isOverdue) {
      row.delayed += 1;
    } else {
      row.onTrack += 1;
    }
    doerAgg.set(step.ownerId, row);
  }
  const doerRows = [...doerAgg.values()].sort((a, b) => b.active - a.active);

  const dueAgg = new Map<string, DueWiseRow>();
  const now = new Date();
  for (const step of filteredSteps) {
    if (!step.isInProgress) {
      continue;
    }
    const bucket = dueBucket(step, now);
    const existing = dueAgg.get(bucket.key) ?? { ...bucket, count: 0 };
    existing.count += 1;
    dueAgg.set(bucket.key, existing);
  }
  const dueOrder = [
    "overdue",
    "today",
    "tomorrow",
    "this_week",
    "later",
    "no_due",
  ];
  const dueRows = dueOrder
    .map((key) => dueAgg.get(key))
    .filter((row): row is DueWiseRow => Boolean(row && row.count > 0));

  const inProgressFiltered = filteredSteps.filter((s) => s.isInProgress);
  const delayedCount = inProgressFiltered.filter((s) => s.isOverdue).length;

  const dueTable = inProgressFiltered
    .filter((s) => s.plannedAt || s.isOverdue)
    .sort((a, b) => {
      if (!a.plannedAt) {
        return 1;
      }
      if (!b.plannedAt) {
        return -1;
      }
      return new Date(a.plannedAt).getTime() - new Date(b.plannedAt).getTime();
    })
    .slice(0, 50)
    .map((step) => ({
      id: `${step.instanceId}-${step.plannedAt}`,
      workflow: step.templateName,
      doer: step.ownerName ?? "Unassigned",
      plannedAt: step.plannedAt,
      status: step.status,
      isOverdue: step.isOverdue,
    }));

  return {
    workflows,
    doers,
    kpis: {
      activeWorkflows: scopedTemplates.length,
      activeLeads: scopedTemplates.reduce((n, t) => n + t.instances.length, 0),
      inProgress: inProgressFiltered.length,
      onTrack: inProgressFiltered.length - delayedCount,
      delayed: delayedCount,
    },
    fmsRows: fmsRows.filter(
      (row) =>
        row.activeLeads > 0 ||
        row.inProgress > 0 ||
        (!filters.doer && !filters.due),
    ),
    doerRows,
    dueRows,
    fmsChart: fmsRows
      .filter((row) => row.inProgress > 0)
      .map((row) => ({
        name:
          row.name.length > 22 ? `${row.name.slice(0, 20)}...` : row.name,
        onTrack: row.onTrack,
        delayed: row.delayed,
      })),
    doerChart: doerRows.map((row) => ({
      name: row.name.length > 18 ? `${row.name.slice(0, 16)}...` : row.name,
      active: row.active,
      delayed: row.delayed,
    })),
    dueChart: dueRows.map((row) => ({
      label: row.label,
      count: row.count,
      fill: DUE_CHART_COLORS[row.label] ?? "#0176d3",
    })),
    dueTable,
  };
}
