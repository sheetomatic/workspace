import type { Role } from "@prisma/client";
import { hasMinimumRole } from "@/lib/permissions";

/** Anmol Traders — Tasks Management client. Team works on WhatsApp only. */
export const ANMOL_TRADERS_SLUG = "anmol-traders";

export type OrgTaskPolicy = {
  /** Repeat WhatsApp due pings every N hours until the task is done. */
  intervalReminderHours: number | null;
  /** Staff/viewers cannot use the web panel. Owner/managers still assign. */
  whatsappOnlyTeam: boolean;
};

const DEFAULT_POLICY: OrgTaskPolicy = {
  intervalReminderHours: null,
  whatsappOnlyTeam: false,
};

const ORG_TASK_POLICIES: Record<string, OrgTaskPolicy> = {
  [ANMOL_TRADERS_SLUG]: {
    intervalReminderHours: 4,
    whatsappOnlyTeam: true,
  },
};

export function getOrgTaskPolicy(slug: string | null | undefined): OrgTaskPolicy {
  if (!slug) {
    return DEFAULT_POLICY;
  }
  return ORG_TASK_POLICIES[slug.trim().toLowerCase()] ?? DEFAULT_POLICY;
}

export function isWhatsAppOnlyTeamMember(
  slug: string | null | undefined,
  role: Role,
  isSuperAdmin = false,
) {
  if (isSuperAdmin) {
    return false;
  }
  const policy = getOrgTaskPolicy(slug);
  if (!policy.whatsappOnlyTeam) {
    return false;
  }
  return !hasMinimumRole(role, "MANAGER");
}

export function istHour(date: Date) {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour");
  return Number(hourPart?.value ?? 0);
}

/** Interval pings only during IST working hours (9:00–20:00). */
export function isIstWorkHours(date: Date) {
  const hour = istHour(date);
  return hour >= 9 && hour < 20;
}

export function shouldSendIntervalReminder(params: {
  slug: string | null | undefined;
  now: Date;
  dueAt: Date;
  lastWhatsAppReminderAt: Date | null;
}) {
  const policy = getOrgTaskPolicy(params.slug);
  if (!policy.intervalReminderHours) {
    return false;
  }
  if (params.dueAt.getTime() > params.now.getTime()) {
    return false;
  }
  if (!params.lastWhatsAppReminderAt) {
    return false;
  }
  if (!isIstWorkHours(params.now)) {
    return false;
  }
  const elapsedMs =
    params.now.getTime() - params.lastWhatsAppReminderAt.getTime();
  return elapsedMs >= policy.intervalReminderHours * 60 * 60 * 1000;
}
