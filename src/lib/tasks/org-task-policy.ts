import type { Role } from "@prisma/client";
import { ANMOL_PORTAL_SLUG } from "@/lib/dedicated-client-portals";
import { hasMinimumRole } from "@/lib/permissions";

/** Anmol Traders — dedicated Tasks Management portal. */
export const ANMOL_TRADERS_SLUG = ANMOL_PORTAL_SLUG;

/** Approved Utility template on Anmol's WABA ({{1}} name, {{2}} task, {{3}} due). */
export const ANMOL_TASK_TEMPLATE_NAME = "sheetomatic1";

export type OrgTaskPolicy = {
  /** Repeat WhatsApp pings every N minutes until the task is done. */
  intervalReminderMinutes: number | null;
  /** Staff/viewers cannot use the web panel. Owner/managers still assign. */
  whatsappOnlyTeam: boolean;
  /** Official API only — never Web Based API. */
  officialWhatsAppOnly: boolean;
};

const DEFAULT_POLICY: OrgTaskPolicy = {
  intervalReminderMinutes: null,
  whatsappOnlyTeam: false,
  officialWhatsAppOnly: false,
};

const ORG_TASK_POLICIES: Record<string, OrgTaskPolicy> = {
  [ANMOL_TRADERS_SLUG]: {
    intervalReminderMinutes: 90,
    whatsappOnlyTeam: true,
    officialWhatsAppOnly: true,
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

export function lastTaskWhatsAppAt(task: {
  whatsappReminderSentAt: Date | null;
  whatsappAssignmentSentAt: Date | null;
  createdAt: Date;
}) {
  return (
    task.whatsappReminderSentAt ??
    task.whatsappAssignmentSentAt ??
    task.createdAt
  );
}

export function shouldSendIntervalReminder(params: {
  slug: string | null | undefined;
  now: Date;
  lastWhatsAppAt: Date | null;
}) {
  const policy = getOrgTaskPolicy(params.slug);
  if (!policy.intervalReminderMinutes) {
    return false;
  }
  if (!params.lastWhatsAppAt) {
    return false;
  }
  if (!isIstWorkHours(params.now)) {
    return false;
  }
  const elapsedMs = params.now.getTime() - params.lastWhatsAppAt.getTime();
  return elapsedMs >= policy.intervalReminderMinutes * 60 * 1000;
}
