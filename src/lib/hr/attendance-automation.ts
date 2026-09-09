import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { sendWorkspaceNoticeWhatsApp } from "@/lib/integrations/whatsapp";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";
import {
  sendWhatsAppInteractiveWithFallback,
} from "@/lib/whatsapp-bot/send";
import { wrapInteractive } from "@/lib/whatsapp-bot/interactive-menu";
import { resolveEnabledHrSubModules } from "@/lib/hr/hr-sub-modules";
import { istCalendarYmd, istNoonDate } from "@/lib/hr/payroll";
import {
  attendanceMarkFallbackText,
  buildAttendanceMarkButtons,
} from "@/lib/hr/attendance-whatsapp";

export { computeLateDeduction, lateToDayRatio } from "@/lib/hr/late-deduction";

export const HR_TZ = "Asia/Kolkata";

export type AttendanceReminderKind = "mark" | "checkout" | "summary";

/** Weekday check in IST (Mon–Fri). */
export function isWeekdayIst(reference = new Date()): boolean {
  const short = reference.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: HR_TZ,
  });
  return short !== "Sat" && short !== "Sun";
}

type MemberLike = {
  userId: string;
  name: string | null;
  phone: string | null;
  role: string;
};

type RecordLike = {
  userId: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  status: string;
  isLate?: boolean | null;
};

/**
 * Members who still need to mark attendance today
 * (no Present/Late/Absent yet; skip leave/holiday).
 */
export function selectMarkReminderRecipients(
  members: MemberLike[],
  records: RecordLike[],
): MemberLike[] {
  const byUser = new Map(records.map((r) => [r.userId, r]));
  return members.filter((m) => {
    const rec = byUser.get(m.userId);
    if (!rec) return true;
    if (rec.status === "ON_LEAVE" || rec.status === "HOLIDAY") return false;
    if (rec.status === "ABSENT") return false;
    if (rec.checkInAt || rec.status === "PRESENT") return false;
    return true;
  });
}

/** @deprecated Evening also uses mark recipients (Present/Late/Absent). Kept for tests. */
export function selectCheckoutReminderRecipients(
  members: MemberLike[],
  records: RecordLike[],
): MemberLike[] {
  return selectMarkReminderRecipients(members, records);
}

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  pendingCheckout: number;
  onLeave: number;
  notMarked: number;
};

/** Today's attendance rollup for the EM/owner summary message. */
export function summarizeAttendance(
  members: MemberLike[],
  records: RecordLike[],
): AttendanceSummary {
  const byUser = new Map(records.map((r) => [r.userId, r]));
  let present = 0;
  let late = 0;
  let pendingCheckout = 0;
  let onLeave = 0;
  let notMarked = 0;

  for (const member of members) {
    const rec = byUser.get(member.userId);
    if (!rec || (!rec.checkInAt && rec.status !== "ON_LEAVE" && rec.status !== "ABSENT")) {
      notMarked += 1;
      continue;
    }
    if (rec.status === "ON_LEAVE") {
      onLeave += 1;
      continue;
    }
    if (rec.status === "ABSENT") {
      continue;
    }
    if (rec.checkInAt || rec.status === "PRESENT") {
      present += 1;
      if (rec.isLate) late += 1;
      if (!rec.checkOutAt) pendingCheckout += 1;
    }
  }

  return {
    total: members.length,
    present,
    late,
    pendingCheckout,
    onLeave,
    notMarked,
  };
}

function firstName(name: string | null, fallback = "there") {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? fallback;
}

function summaryMessage(orgName: string, s: AttendanceSummary) {
  const dayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: HR_TZ,
  });
  return [
    `*Attendance summary — ${dayLabel}*`,
    "",
    `Team: ${orgName}`,
    `Present: ${s.present}/${s.total}`,
    `Late: ${s.late}`,
    `Yet to check out: ${s.pendingCheckout}`,
    `On leave: ${s.onLeave}`,
    `Not marked: ${s.notMarked}`,
    "",
    "Open EM board: /app/em",
  ].join("\n");
}

async function attendanceEnabledOrgIds(): Promise<
  { organizationId: string; workStartTime: string; workEndTime: string }[]
> {
  const settings = await prisma.workspaceHrSettings.findMany({
    select: {
      organizationId: true,
      enabledHrSubModules: true,
      workStartTime: true,
      workEndTime: true,
    },
  });
  return settings
    .filter((s) =>
      resolveEnabledHrSubModules(s.enabledHrSubModules).includes("attendance"),
    )
    .map((s) => ({
      organizationId: s.organizationId,
      workStartTime: s.workStartTime,
      workEndTime: s.workEndTime,
    }));
}

async function sendAttendanceMarkPrompt(params: {
  organizationId: string;
  toPhone: string;
  name: string | null;
  orgName: string;
  workStartTime: string;
  workDateYmd: string;
  window: "morning" | "evening";
}) {
  const hasSession = await hasActiveWhatsAppSession(
    params.organizationId,
    params.toPhone,
  );
  if (!hasSession) {
    return {
      sent: false as const,
      reason: "session_required" as const,
    };
  }

  const first = firstName(params.name);
  const interactive = wrapInteractive(
    buildAttendanceMarkButtons({
      workDateYmd: params.workDateYmd,
      firstName: first,
      orgName: params.orgName,
      window: params.window,
      workStartTime: params.workStartTime,
    }),
  );
  const fallback = attendanceMarkFallbackText({
    firstName: first,
    orgName: params.orgName,
    window: params.window,
    workStartTime: params.workStartTime,
  });

  return sendWhatsAppInteractiveWithFallback({
    organizationId: params.organizationId,
    toPhone: params.toPhone,
    interactive,
    fallbackText: fallback,
  });
}

/**
 * Send attendance mark prompts / summary for every HR-attendance org.
 * Mark + evening both use Present / Late / Absent WhatsApp buttons (no app).
 */
export async function runHrAttendanceReminders(
  kind: AttendanceReminderKind,
  now = new Date(),
): Promise<{
  kind: AttendanceReminderKind;
  skipped?: string;
  orgs: number;
  recipients: number;
  sent: number;
}> {
  if (!isWeekdayIst(now)) {
    return { kind, skipped: "weekend", orgs: 0, recipients: 0, sent: 0 };
  }

  const workDateYmd = istCalendarYmd(now);
  const workDate = istNoonDate(workDateYmd);
  const orgs = await attendanceEnabledOrgIds();

  let recipients = 0;
  let sent = 0;
  let orgsProcessed = 0;

  for (const org of orgs) {
    const holiday = await prisma.hrHoliday.findFirst({
      where: { organizationId: org.organizationId, date: workDate },
      select: { id: true },
    });
    if (holiday) {
      continue;
    }

    const [orgRow, memberships, records] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: org.organizationId },
        select: { name: true },
      }),
      prisma.membership.findMany({
        where: { organizationId: org.organizationId, deactivatedAt: null },
        select: {
          userId: true,
          role: true,
          user: { select: { name: true, phone: true } },
        },
      }),
      prisma.attendanceRecord.findMany({
        where: { organizationId: org.organizationId, workDate },
        select: {
          userId: true,
          checkInAt: true,
          checkOutAt: true,
          status: true,
          isLate: true,
        },
      }),
    ]);

    const members: MemberLike[] = memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      phone: m.user.phone,
      role: m.role,
    }));
    const orgName = orgRow?.name ?? "Your team";
    orgsProcessed += 1;

    if (kind === "summary") {
      const summary = summarizeAttendance(members, records);
      const admins = members.filter(
        (m) => hasMinimumRole(m.role as never, "MANAGER") && m.phone,
      );
      recipients += admins.length;
      for (const admin of admins) {
        const res = await sendWorkspaceNoticeWhatsApp({
          toPhone: admin.phone!,
          organizationId: org.organizationId,
          body: summaryMessage(orgName, summary),
        });
        if (res.sent) sent += 1;
      }
      continue;
    }

    // Morning + evening: same Present / Late / Absent WhatsApp buttons.
    const targets = selectMarkReminderRecipients(members, records);
    const withPhone = targets.filter((m) => m.phone);
    recipients += withPhone.length;
    const window = kind === "mark" ? "morning" : "evening";

    for (const member of withPhone) {
      const res = await sendAttendanceMarkPrompt({
        organizationId: org.organizationId,
        toPhone: member.phone!,
        name: member.name,
        orgName,
        workStartTime: org.workStartTime,
        workDateYmd,
        window,
      });
      if (res.sent) sent += 1;
    }
  }

  return { kind, orgs: orgsProcessed, recipients, sent };
}
