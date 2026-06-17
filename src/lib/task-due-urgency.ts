import type { TaskStatus } from "@prisma/client";

export type TaskDueUrgency =
  | "completed-on-time"
  | "completed-late"
  | "due-overdue"
  | "due-today"
  | "due-soon"
  | "due-future"
  | "waiting-revision"
  | "waiting-extension"
  | "waiting-help"
  | "waiting-verification";

export function isTaskDueToday(dueAt: Date) {
  const now = new Date();
  return dueAt.toDateString() === now.toDateString();
}

export function isTaskActiveStatus(status: TaskStatus) {
  return (
    status === "PENDING" ||
    status === "IN_PROGRESS" ||
    status === "AWAITING_VERIFICATION" ||
    status === "REVISION_REQUESTED" ||
    status === "EXTENSION_REQUESTED" ||
    status === "HELP_REQUESTED"
  );
}

export function wasCompletedOnTime(dueAt: Date, completedAt: Date | null | undefined) {
  if (!completedAt) {
    return false;
  }
  return completedAt.getTime() <= dueAt.getTime();
}

export function getTaskDueUrgency(input: {
  dueAt: Date;
  status: TaskStatus;
  completedAt?: Date | null;
}): TaskDueUrgency {
  const { dueAt, status, completedAt } = input;

  if (status === "REVISION_REQUESTED") {
    return "waiting-revision";
  }
  if (status === "EXTENSION_REQUESTED") {
    return "waiting-extension";
  }
  if (status === "HELP_REQUESTED") {
    return "waiting-help";
  }
  if (status === "AWAITING_VERIFICATION") {
    return "waiting-verification";
  }

  if (status === "COMPLETED") {
    return wasCompletedOnTime(dueAt, completedAt)
      ? "completed-on-time"
      : "completed-late";
  }

  const now = Date.now();
  if (dueAt.getTime() < now) {
    return "due-overdue";
  }
  if (isTaskDueToday(dueAt)) {
    return "due-today";
  }

  const dayMs = 86_400_000;
  const daysUntil = Math.ceil((dueAt.getTime() - now) / dayMs);
  if (daysUntil <= 2) {
    return "due-soon";
  }

  return "due-future";
}

export function taskUrgencyLabel(urgency: TaskDueUrgency) {
  switch (urgency) {
    case "completed-on-time":
      return "Completed on time";
    case "completed-late":
      return "Completed late";
    case "due-overdue":
      return "Overdue";
    case "due-today":
      return "Due today";
    case "due-soon":
      return "Due soon";
    case "due-future":
      return "Scheduled";
    case "waiting-revision":
      return "Revision requested";
    case "waiting-extension":
      return "Extension requested";
    case "waiting-help":
      return "Help requested";
    case "waiting-verification":
      return "Awaiting verification";
  }
}

export function taskUrgencyClass(urgency: TaskDueUrgency) {
  return `urgency-${urgency}`;
}
