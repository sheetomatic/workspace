import type { WaPipelineStage } from "@prisma/client";

export const WA_PIPELINE_LABELS: Record<WaPipelineStage, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  DEMO_BOOKED: "Demo booked",
  WON: "Won",
  LOST: "Lost",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export function formatFollowUpTime(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function followUpUrgency(scheduledAt: Date) {
  const todayStart = startOfToday().getTime();
  const t = scheduledAt.getTime();
  if (t < todayStart) {
    return "overdue" as const;
  }
  if (t < startOfTomorrow().getTime()) {
    return "today" as const;
  }
  return "upcoming" as const;
}

export function parseContactTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}
