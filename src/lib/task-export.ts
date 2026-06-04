import type { DelegatedTask, User } from "@prisma/client";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/tasks";

export type TaskExportRow = DelegatedTask & {
  assignee: Pick<User, "name" | "email">;
  createdBy: Pick<User, "name" | "email">;
};

const EXPORT_HEADERS = [
  "Title",
  "Status",
  "Priority",
  "Department",
  "Category",
  "Assignee",
  "Assignee Email",
  "Created By",
  "Due At",
  "Completed At",
  "Recurring",
  "Frequency",
  "Created At",
  "Instructions",
] as const;

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatExportDate(date: Date | null | undefined) {
  if (!date) {
    return "";
  }
  return date.toISOString();
}

export function taskExportRowValues(task: TaskExportRow) {
  return [
    task.title,
    TASK_STATUS_LABELS[task.status],
    TASK_PRIORITY_LABELS[task.priority],
    TASK_DEPARTMENT_LABELS[task.department],
    task.category ?? "",
    task.assignee.name ?? task.assignee.email.split("@")[0],
    task.assignee.email,
    task.createdBy.name ?? task.createdBy.email.split("@")[0],
    formatExportDate(task.dueAt),
    formatExportDate(task.completedAt),
    task.isRecurring ? "Yes" : "No",
    task.frequency,
    formatExportDate(task.createdAt),
    task.instructions ?? "",
  ];
}

export function tasksToCsv(tasks: TaskExportRow[]) {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...tasks.map((task) =>
      taskExportRowValues(task).map((cell) => escapeCsvCell(String(cell))).join(","),
    ),
  ];
  return lines.join("\n");
}

export function tasksToSheetRows(tasks: TaskExportRow[]) {
  return [[...EXPORT_HEADERS], ...tasks.map((task) => taskExportRowValues(task))];
}
