import type { FmsStepStatus, TaskStatus } from "@prisma/client";

export type MisScoreTier = "excellent" | "good" | "fair" | "poor";

export type MisScoreResult = {
  score: number;
  tier: MisScoreTier;
  label: string;
};

function tierFromScore(score: number): MisScoreTier {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "good";
  }
  if (score >= 50) {
    return "fair";
  }
  return "poor";
}

function result(score: number, label: string): MisScoreResult {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, tier: tierFromScore(clamped), label };
}

/** Static score for dashboards when only a numeric average is available. */
export function misScoreFromPoints(score: number, label = "Average"): MisScoreResult {
  return result(score, label);
}

/** Step completed on time = 100; penalize ~2 pts per hour late. */
export function fmsStepMisScore(input: {
  plannedAt: Date | null;
  actualAt: Date | null;
  delayMinutes: number | null;
  status: FmsStepStatus;
}): MisScoreResult {
  if (input.status === "PENDING") {
    return result(100, "Not started");
  }
  if (input.status === "IN_PROGRESS") {
    if (!input.plannedAt) {
      return result(85, "In progress");
    }
    const now = Date.now();
    if (now <= input.plannedAt.getTime()) {
      return result(90, "On track");
    }
    const hoursLate = (now - input.plannedAt.getTime()) / (1000 * 60 * 60);
    return result(90 - hoursLate * 2, "Overdue");
  }
  if (input.status === "SKIPPED") {
    return result(50, "Skipped");
  }
  if (!input.actualAt) {
    return result(0, "Incomplete");
  }
  const delay = input.delayMinutes ?? 0;
  if (delay <= 0) {
    return result(100, "On time");
  }
  return result(100 - (delay / 60) * 2, "Late");
}

export function fmsJobMisScore(
  steps: Array<{
    plannedAt: Date | null;
    actualAt: Date | null;
    delayMinutes: number | null;
    status: FmsStepStatus;
  }>,
): MisScoreResult {
  if (steps.length === 0) {
    return result(100, "No steps");
  }
  const done = steps.filter((s) => s.status === "DONE");
  const active = steps.find((s) => s.status === "IN_PROGRESS");
  if (done.length === 0 && active) {
    return fmsStepMisScore(active);
  }
  if (done.length === 0) {
    return result(100, "Starting");
  }
  const scores = done.map((s) => fmsStepMisScore(s).score);
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const allDone = done.length === steps.length;
  return result(avg, allDone ? "Completed" : "In pipeline");
}

export function taskMisScore(input: {
  status: TaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
}): MisScoreResult {
  if (input.status === "COMPLETED") {
    if (!input.dueAt || !input.completedAt) {
      return result(100, "Done");
    }
    const diffMs = input.completedAt.getTime() - input.dueAt.getTime();
    if (diffMs <= 0) {
      return result(100, "On time");
    }
    const hoursLate = diffMs / (1000 * 60 * 60);
    return result(100 - hoursLate * 2, "Late");
  }
  if (
    input.status === "REVISION_REQUESTED" ||
    input.status === "EXTENSION_REQUESTED" ||
    input.status === "HELP_REQUESTED"
  ) {
    return result(55, "Blocked");
  }
  if (input.status === "AWAITING_VERIFICATION") {
    return result(80, "Awaiting verification");
  }
  if (input.status === "IN_PROGRESS") {
    if (!input.dueAt) {
      return result(85, "In progress");
    }
    if (Date.now() <= input.dueAt.getTime()) {
      return result(90, "On track");
    }
    const hoursLate = (Date.now() - input.dueAt.getTime()) / (1000 * 60 * 60);
    return result(90 - hoursLate * 2, "Overdue");
  }
  return result(70, "Pending");
}

/** Checklist completion ratio (capture fields, proof items, etc.). */
export function checklistMisScore(completed: number, total: number): MisScoreResult {
  if (total <= 0) {
    return result(100, "No items");
  }
  const ratio = completed / total;
  return result(ratio * 100, `${completed}/${total} done`);
}

export function aggregateMisScore(scores: number[]): MisScoreResult {
  if (scores.length === 0) {
    return result(100, "No data");
  }
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return result(avg, "Average");
}
