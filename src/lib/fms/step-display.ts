import { computeDelayMinutes } from "@/lib/fms/sla";

export function liveDelayMinutes(
  plannedAt: Date | null,
  actualAt: Date | null,
  storedDelayMinutes: number | null,
  now = new Date(),
): number | null {
  if (storedDelayMinutes !== null && storedDelayMinutes > 0) {
    return storedDelayMinutes;
  }
  if (actualAt) {
    return storedDelayMinutes;
  }
  return computeDelayMinutes(plannedAt, null, now);
}

export function formatDelayLabel(delayMinutes: number | null) {
  if (!delayMinutes || delayMinutes <= 0) {
    return null;
  }
  if (delayMinutes < 60) {
    return `${delayMinutes}m late`;
  }
  if (delayMinutes < 24 * 60) {
    return `${Math.round(delayMinutes / 60)}h late`;
  }
  const days = Math.round(delayMinutes / (24 * 60));
  return `${days}d late`;
}

export function isStepOverdue(
  status: string,
  plannedAt: Date | null,
  actualAt: Date | null,
  delayMinutes: number | null,
) {
  const delay = liveDelayMinutes(plannedAt, actualAt, delayMinutes);
  if (!delay || delay <= 0) {
    return false;
  }
  return status === "IN_PROGRESS" || status === "DONE";
}

export type StepUrgencyTier = "normal" | "same-day" | "overdue";

export function computeStepUrgency(
  status: string,
  plannedAt: Date | null,
  now = new Date(),
): StepUrgencyTier {
  if (status !== "IN_PROGRESS" || !plannedAt) {
    return "normal";
  }

  const msUntilDue = plannedAt.getTime() - now.getTime();
  if (msUntilDue < 0) {
    return "overdue";
  }

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const plannedDayStart = new Date(plannedAt);
  plannedDayStart.setHours(0, 0, 0, 0);

  if (plannedDayStart.getTime() === dayStart.getTime()) {
    return "same-day";
  }

  const hoursUntilDue = msUntilDue / (1000 * 60 * 60);
  if (hoursUntilDue <= 24) {
    return "same-day";
  }

  return "normal";
}

export function urgencyClassName(tier: StepUrgencyTier) {
  if (tier === "overdue") {
    return "ws-fms-urgency-overdue";
  }
  if (tier === "same-day") {
    return "ws-fms-urgency-same-day";
  }
  return "";
}

export function slaSummary(
  slaType: string,
  slaConfig: { days?: number; hours?: number; atHour?: number; atMinute?: number; minusDays?: number },
) {
  if (slaType === "NONE") {
    return "No TAT";
  }
  if (slaType === "TAT_CALENDAR_DAYS") {
    const days = slaConfig.days ?? 1;
    return `${days} working day${days === 1 ? "" : "s"} (MonSat)`;
  }
  if (slaType === "TAT_WORKING_HOURS") {
    const hours = slaConfig.hours ?? 24;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (slaType === "SPECIFIC_TIME") {
    const days = slaConfig.days ?? 0;
    const hour = slaConfig.atHour ?? 18;
    const minute = String(slaConfig.atMinute ?? 0).padStart(2, "0");
    return days > 0
      ? `${days}d @ ${hour}:${minute}`
      : `Due @ ${hour}:${minute}`;
  }
  if (slaType === "LEAD_TIME_MINUS") {
    const minus = slaConfig.minusDays ?? 0;
    return `${minus}d before deadline`;
  }
  return slaType.replaceAll("_", " ").toLowerCase();
}
