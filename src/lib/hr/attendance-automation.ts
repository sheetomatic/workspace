import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { sendWorkspaceNoticeWhatsApp } from "@/lib/integrations/whatsapp";
import { resolveEnabledHrSubModules } from "@/lib/hr/hr-sub-modules";
import { istCalendarYmd, istNoonDate } from "@/lib/hr/payroll";

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

/** Members with no check-in today (and not already on leave/holiday). */
export function selectMarkReminderRecipients(
  members: MemberLike[],
  records: RecordLike[],
): MemberLike[] {
  const byUser = new Map(records.map((r) => [r.userId, r]));
  return members.filter((m) => {
    const rec = byUser.get(m.userId);
    if (!rec) return true; // no record at all → hasn't marked
    if (rec.checkInAt) return false; // already checked in
    // A manager-marked ON_LEAVE / HOLIDAY should not be nagged.
    return rec.status !== "ON_LEAVE" && rec.status !== "HOLIDAY";
  });
}

/** Members who checked in but have not checked out yet. */
export function selectCheckoutReminderRecipients(
  members: MemberLike[],
  records: RecordLike[],
): MemberLike[] {
  const byUser = new Map(records.map((r) => [r.userId, r]));
  return members.filter((m) => {
    const rec = byUser.get(m.userId);
    return Boolean(rec?.checkInAt) && !rec?.checkOutAt;
  });
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
    if (!rec || (!rec.checkInAt && rec.status !== "ON_LEAVE")) {
      notMarked += 1;
      continue;
    }
    if (rec.status === "ON_LEAVE") {
      onLeave += 1;
      continue;
    }
    if (rec.checkInAt) {
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

function markMessage(name: string | null, orgName: string, startTime: string) {
  return [
    "*Mark your attendance*",
    "",
    `Hi ${firstName(name)}, please check in for today on Sheetomatic.`,
    `Work starts at ${startTime}. Check in after that is marked *Late*.`,
    "",
    `Team: ${orgName}`,
    "Open Attendance: /app/hr/attendance",
  ].join("\n");
}

function checkoutMessage(name: string | null, orgName: string, endTime: string) {
  return [
    "*Check out reminder*",
    "",
    `Hi ${firstName(name)}, you checked in today but haven't checked out.`,
    `Work ends at ${endTime}. Please check out to close your day.`,
    "",
    `Team: ${orgName}`,
    "Open Attendance: /app/hr/attendance",
  ].join("\n");
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
    .filter((s) => resolveEnabledHrSubModules(s.enabledHrSubModules).includes("attendance"))
    .map((s) => ({
      organizationId: s.organizationId,
      workStartTime: s.workStartTime,
      workEndTime: s.workEndTime,
    }));
}

/**
 * Send attendance reminders / summary for every HR-attendance org.
 * WhatsApp send is a no-op (reason: not_configured / session_required) when the
 * org has no active WhatsApp channel; the recipient computation still runs.
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

  const workDate = istNoonDate(istCalendarYmd(now));
  const orgs = await attendanceEnabledOrgIds();

  let recipients = 0;
  let sent = 0;
  let orgsProcessed = 0;

  for (const org of orgs) {
    // Skip company holidays.
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

    const targets =
      kind === "mark"
        ? selectMarkReminderRecipients(members, records)
        : selectCheckoutReminderRecipients(members, records);
    const withPhone = targets.filter((m) => m.phone);
    recipients += withPhone.length;

    for (const member of withPhone) {
      const body =
        kind === "mark"
          ? markMessage(member.name, orgName, org.workStartTime)
          : checkoutMessage(member.name, orgName, org.workEndTime);
      const res = await sendWorkspaceNoticeWhatsApp({
        toPhone: member.phone!,
        organizationId: org.organizationId,
        body,
      });
      if (res.sent) sent += 1;
    }
  }

  return { kind, orgs: orgsProcessed, recipients, sent };
}
