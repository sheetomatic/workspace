import { Decimal } from "@prisma/client/runtime/library";
import type { AttendanceDayStatus, LeaveType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computePayrollPayAmounts } from "@/lib/hr/salary-slip";
import {
  resolveHourlyRate,
  shortLeavePayableFraction,
} from "@/lib/hr/working-hours";

export const HR_TZ = "Asia/Kolkata";

/** Calendar YYYY-MM-DD in Asia/Kolkata (avoids UTC shift from toISOString). */
export function istCalendarYmd(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: HR_TZ });
}

/** Noon-UTC Date for a calendar YMD (matches AttendanceRecord workDate convention). */
export function istNoonDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

function dateYmdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dec(value: number): Decimal {
  return new Decimal(Math.round(value * 100) / 100);
}

function eachDateInclusive(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(12, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(12, 0, 0, 0);
  while (cursor <= last) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function isWeekday(date: Date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

export const DEFAULT_LEAVE_BALANCE: Record<LeaveType, number> = {
  CASUAL: 12,
  SICK: 12,
  EARNED: 15,
  UNPAID: 0,
  COMP_OFF: 0,
};

/** Resolve default days from LeavePolicy when present, else hardcoded defaults. */
export async function resolveLeavePolicyDays(
  organizationId: string,
  year: number,
): Promise<Record<LeaveType, number>> {
  const policies = await prisma.leavePolicy.findMany({
    where: { organizationId, year },
    select: { leaveType: true, defaultDays: true },
  });
  const resolved = { ...DEFAULT_LEAVE_BALANCE };
  for (const policy of policies) {
    resolved[policy.leaveType] = policy.defaultDays;
  }
  return resolved;
}

export async function ensureLeaveBalances(
  organizationId: string,
  userId: string,
  year: number,
) {
  const defaults = await resolveLeavePolicyDays(organizationId, year);
  for (const [leaveType, balanceDays] of Object.entries(defaults) as Array<
    [LeaveType, number]
  >) {
    await prisma.leaveBalance.upsert({
      where: {
        organizationId_userId_leaveType_year: {
          organizationId,
          userId,
          leaveType,
          year,
        },
      },
      create: {
        organizationId,
        userId,
        leaveType,
        year,
        balanceDays,
        usedDays: 0,
      },
      update: {},
    });
  }
}

/** ADMIN: set LeaveBalance.balanceDays for a member (allocation). */
export async function setLeaveBalanceAllocation(params: {
  organizationId: string;
  userId: string;
  leaveType: LeaveType;
  year: number;
  balanceDays: number;
}) {
  if (!Number.isFinite(params.balanceDays) || params.balanceDays < 0) {
    throw new Error("Balance days must be a non-negative number.");
  }
  await ensureLeaveBalances(params.organizationId, params.userId, params.year);
  return prisma.leaveBalance.update({
    where: {
      organizationId_userId_leaveType_year: {
        organizationId: params.organizationId,
        userId: params.userId,
        leaveType: params.leaveType,
        year: params.year,
      },
    },
    data: { balanceDays: params.balanceDays },
  });
}

export async function upsertLeavePolicy(params: {
  organizationId: string;
  leaveType: LeaveType;
  year: number;
  defaultDays: number;
}) {
  if (!Number.isFinite(params.defaultDays) || params.defaultDays < 0) {
    throw new Error("Default days must be a non-negative number.");
  }
  return prisma.leavePolicy.upsert({
    where: {
      organizationId_leaveType_year: {
        organizationId: params.organizationId,
        leaveType: params.leaveType,
        year: params.year,
      },
    },
    create: {
      organizationId: params.organizationId,
      leaveType: params.leaveType,
      year: params.year,
      defaultDays: params.defaultDays,
    },
    update: { defaultDays: params.defaultDays },
  });
}

export async function listLeavePolicies(organizationId: string, year: number) {
  return prisma.leavePolicy.findMany({
    where: { organizationId, year },
    orderBy: { leaveType: "asc" },
  });
}

export async function listLeaveBalances(organizationId: string, userId: string, year: number) {
  await ensureLeaveBalances(organizationId, userId, year);
  return prisma.leaveBalance.findMany({
    where: { organizationId, userId, year },
    orderBy: { leaveType: "asc" },
  });
}

/** On leave approval: debit balance and mark attendance ON_LEAVE for weekdays in range. */
export async function applyApprovedLeave(params: {
  organizationId: string;
  leaveRequestId: string;
  reviewerId: string;
}) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: params.leaveRequestId, organizationId: params.organizationId },
  });
  if (!request || request.status !== "PENDING") {
    throw new Error("Leave request not found or already reviewed.");
  }

  const dates = eachDateInclusive(request.startDate, request.endDate).filter(isWeekday);
  const weekdayDays = dates.length;
  if (weekdayDays < 1) {
    throw new Error("Leave range has no working days.");
  }

  const year = request.startDate.getUTCFullYear();
  await ensureLeaveBalances(params.organizationId, request.userId, year);

  await prisma.$transaction(async (tx) => {
    if (request.leaveType !== "UNPAID") {
      const balance = await tx.leaveBalance.findUnique({
        where: {
          organizationId_userId_leaveType_year: {
            organizationId: params.organizationId,
            userId: request.userId,
            leaveType: request.leaveType,
            year,
          },
        },
      });
      const remaining = (balance?.balanceDays ?? 0) - (balance?.usedDays ?? 0);
      if (remaining < weekdayDays) {
        throw new Error(
          `Insufficient ${request.leaveType.toLowerCase()} leave balance (${remaining} days left).`,
        );
      }
      await tx.leaveBalance.update({
        where: { id: balance!.id },
        data: { usedDays: { increment: weekdayDays } },
      });
    }

    await tx.leaveRequest.update({
      where: { id: request.id },
      data: {
        days: weekdayDays,
        status: "APPROVED",
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
      },
    });

    for (const workDate of dates) {
      await tx.attendanceRecord.upsert({
        where: {
          organizationId_userId_workDate: {
            organizationId: params.organizationId,
            userId: request.userId,
            workDate,
          },
        },
        create: {
          organizationId: params.organizationId,
          userId: request.userId,
          workDate,
          status: "ON_LEAVE",
          method: "WEB",
          notes: `Leave · ${request.leaveType}`,
          markedById: params.reviewerId,
        },
        update: {
          status: "ON_LEAVE",
          notes: `Leave · ${request.leaveType}`,
          markedById: params.reviewerId,
        },
      });
    }
  });
}

export async function rejectLeaveRequest(params: {
  organizationId: string;
  leaveRequestId: string;
  reviewerId: string;
}) {
  await prisma.leaveRequest.updateMany({
    where: {
      id: params.leaveRequestId,
      organizationId: params.organizationId,
      status: "PENDING",
    },
    data: {
      status: "REJECTED",
      reviewedById: params.reviewerId,
      reviewedAt: new Date(),
    },
  });
}

function payableFromStatus(
  status: AttendanceDayStatus,
  unpaidLeave: boolean,
  shortLeaveFraction: number,
  verified: boolean,
): number {
  // Unverified self-punches do not count as payable Present.
  if (!verified && (status === "PRESENT" || status === "HALF_DAY" || status === "SHORT_LEAVE")) {
    return 0;
  }
  switch (status) {
    case "PRESENT":
    case "HOLIDAY":
      return 1;
    case "ON_LEAVE":
      // Paid leave (CL/SL/EL/comp-off) earns salary; UNPAID does not.
      return unpaidLeave ? 0 : 1;
    case "HALF_DAY":
      return 0.5;
    case "SHORT_LEAVE":
      return shortLeaveFraction;
    case "ABSENT":
    default:
      return 0;
  }
}

function buildUnpaidLeaveKeys(
  leaves: Array<{ userId: string; startDate: Date; endDate: Date }>,
): Set<string> {
  const keys = new Set<string>();
  for (const leave of leaves) {
    for (const workDate of eachDateInclusive(leave.startDate, leave.endDate).filter(isWeekday)) {
      keys.add(`${leave.userId}:${dateYmdUtc(workDate)}`);
    }
  }
  return keys;
}

export async function generatePayrollFromAttendance(params: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  // workingDays = weekdays from periodStart through min(periodEnd, today IST); future unmarked days are ignored.
  const todayIst = istNoonDate(istCalendarYmd());
  const payThrough = minDate(params.periodEnd, todayIst);
  const weekdayDates = eachDateInclusive(params.periodStart, payThrough).filter(isWeekday);
  const workingDays = weekdayDates.length;
  if (workingDays <= 0) {
    throw new Error("Period has no working days through today.");
  }

  const [members, attendance, unpaidLeaves, hrSettings] = await Promise.all([
    prisma.membership.findMany({
      where: {
        organizationId: params.organizationId,
        deactivatedAt: null,
        role: { not: "VIEWER" },
      },
      select: {
        userId: true,
        monthlySalary: true,
        user: { select: { id: true, name: true, email: true } },
        employeeProfile: {
          select: {
            basic: true,
            hra: true,
            specialAllowance: true,
            pfApplicable: true,
            esiApplicable: true,
            tdsMonthly: true,
            collarCategory: true,
            hourlyRate: true,
          },
        },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        organizationId: params.organizationId,
        workDate: { gte: params.periodStart, lte: payThrough },
      },
      select: {
        userId: true,
        status: true,
        workDate: true,
        notes: true,
        verifyStatus: true,
        otHours: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId: params.organizationId,
        status: "APPROVED",
        leaveType: "UNPAID",
        startDate: { lte: payThrough },
        endDate: { gte: params.periodStart },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
    prisma.workspaceHrSettings.upsert({
      where: { organizationId: params.organizationId },
      create: { organizationId: params.organizationId },
      update: {},
    }),
  ]);

  const shortLeaveFraction = shortLeavePayableFraction({
    shortLeaveHours: hrSettings.shortLeaveHours,
    workStartTime: hrSettings.workStartTime,
    workEndTime: hrSettings.workEndTime,
  });

  const unpaidKeys = buildUnpaidLeaveKeys(unpaidLeaves);

  type DayRow = {
    status: AttendanceDayStatus;
    notes: string | null;
    verifyStatus: string;
    otHours: number;
  };
  const byUserDate = new Map<string, Map<string, DayRow>>();
  for (const row of attendance) {
    const ymd = dateYmdUtc(row.workDate);
    let userMap = byUserDate.get(row.userId);
    if (!userMap) {
      userMap = new Map();
      byUserDate.set(row.userId, userMap);
    }
    userMap.set(ymd, {
      status: row.status,
      notes: row.notes,
      verifyStatus: row.verifyStatus,
      otHours: row.otHours ?? 0,
    });
  }

  const lines: Array<{
    userId: string;
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    halfDays: number;
    shortLeaveDays: number;
    payableDays: number;
    workingDays: number;
    otHours: number;
    otPay: number;
    monthlySalary: number;
    earnedSalary: number;
    deductions: number;
    netPay: number;
    notes: string | null;
  }> = [];

  for (const member of members) {
    const salary = Number(member.monthlySalary ?? 0);
    if (salary <= 0) {
      continue;
    }
    const userMap = byUserDate.get(member.userId) ?? new Map();
    let presentDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let shortLeaveDays = 0;
    let payableDays = 0;
    let unmarked = 0;
    let unpaidLeaveDays = 0;
    let pendingUnverified = 0;
    let otHoursTotal = 0;

    for (const workDate of weekdayDates) {
      const ymd = dateYmdUtc(workDate);
      const row = userMap.get(ymd);
      if (!row) {
        unmarked += 1;
        absentDays += 1;
        continue;
      }
      const { status, notes, verifyStatus, otHours } = row;
      const verified = verifyStatus === "VERIFIED";
      if (!verified && (status === "PRESENT" || status === "HALF_DAY" || status === "SHORT_LEAVE")) {
        pendingUnverified += 1;
      }
      if (status === "PRESENT" && verified) presentDays += 1;
      if (status === "ON_LEAVE") leaveDays += 1;
      if (status === "ABSENT" || verifyStatus === "REJECTED") absentDays += 1;
      if (status === "HALF_DAY" && verified) halfDays += 1;
      if (status === "SHORT_LEAVE" && verified) shortLeaveDays += 1;

      const unpaidLeave =
        status === "ON_LEAVE" &&
        (unpaidKeys.has(`${member.userId}:${ymd}`) ||
          (notes?.toUpperCase().includes("UNPAID") ?? false));
      if (unpaidLeave) unpaidLeaveDays += 1;
      payableDays += payableFromStatus(status, unpaidLeave, shortLeaveFraction, verified);

      if (
        member.employeeProfile?.collarCategory === "BLUE" &&
        verified &&
        otHours > 0
      ) {
        otHoursTotal += otHours;
      }
    }

    const hourly = resolveHourlyRate({
      hourlyRate:
        member.employeeProfile?.hourlyRate != null
          ? Number(member.employeeProfile.hourlyRate)
          : null,
      monthlySalary: salary,
      workStartTime: hrSettings.workStartTime,
      workEndTime: hrSettings.workEndTime,
    });
    const otPay =
      member.employeeProfile?.collarCategory === "BLUE"
        ? Math.round(otHoursTotal * hourly * 100) / 100
        : 0;

    const baseEarned = (salary / workingDays) * payableDays;
    const earnedSalary = baseEarned + otPay;
    const profile = member.employeeProfile;
    const pay = computePayrollPayAmounts({
      monthlySalary: salary,
      earnedSalary,
      payableDays,
      workingDays,
      profile: {
        basic: profile?.basic != null ? Number(profile.basic) : null,
        hra: profile?.hra != null ? Number(profile.hra) : null,
        specialAllowance:
          profile?.specialAllowance != null
            ? Number(profile.specialAllowance)
            : null,
        pfApplicable: profile?.pfApplicable ?? false,
        esiApplicable: profile?.esiApplicable ?? false,
        tdsMonthly:
          profile?.tdsMonthly != null ? Number(profile.tdsMonthly) : null,
      },
    });
    const noteParts: string[] = [];
    if (unmarked > 0) noteParts.push(`${unmarked} unmarked weekday(s) treated as absent`);
    if (unpaidLeaveDays > 0) noteParts.push(`${unpaidLeaveDays} unpaid leave day(s) not payable`);
    if (pendingUnverified > 0) {
      noteParts.push(`${pendingUnverified} unverified punch(es) not payable`);
    }
    if (otHoursTotal > 0) {
      noteParts.push(`OT ${otHoursTotal}h × ₹${hourly.toFixed(2)} = ₹${otPay.toFixed(2)}`);
    }

    lines.push({
      userId: member.userId,
      presentDays,
      leaveDays,
      absentDays,
      halfDays,
      shortLeaveDays,
      payableDays,
      workingDays,
      otHours: otHoursTotal,
      otPay,
      monthlySalary: salary,
      earnedSalary,
      deductions: pay.totalDeductions,
      netPay: pay.netPay,
      notes: noteParts.length > 0 ? noteParts.join(" · ") : null,
    });
  }

  if (lines.length === 0) {
    throw new Error(
      "No employees with monthly salary set. Set salary under Team → edit member, then retry.",
    );
  }

  const totalGross = lines.reduce((sum, line) => sum + line.earnedSalary, 0);
  const totalNet = lines.reduce((sum, line) => sum + line.netPay, 0);

  return prisma.payrollRun.create({
    data: {
      organizationId: params.organizationId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      employeeCount: lines.length,
      totalGross: dec(totalGross),
      totalNet: dec(totalNet),
      status: "DRAFT",
      notes: `Attendance-based payroll · ${workingDays} working days through ${dateYmdUtc(payThrough)} · paid leave payable, unpaid leave not · unverified punches excluded`,
      lines: {
        create: lines.map((line) => ({
          organizationId: params.organizationId,
          userId: line.userId,
          presentDays: line.presentDays,
          leaveDays: line.leaveDays,
          absentDays: line.absentDays,
          halfDays: line.halfDays,
          shortLeaveDays: line.shortLeaveDays,
          payableDays: line.payableDays,
          workingDays: line.workingDays,
          otHours: line.otHours,
          otPay: dec(line.otPay),
          monthlySalary: dec(line.monthlySalary),
          earnedSalary: dec(line.earnedSalary),
          deductions: dec(line.deductions),
          netPay: dec(line.netPay),
          notes: line.notes,
        })),
      },
    },
    include: {
      lines: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
}

export async function listAttendanceForPeriod(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      workDate: { gte: periodStart, lte: periodEnd },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: [{ workDate: "desc" }, { checkInAt: "desc" }],
    take: 500,
  });
}

export async function markAttendanceDay(params: {
  organizationId: string;
  actorUserId: string;
  userId: string;
  workDate: Date;
  status: AttendanceDayStatus;
  notes?: string;
  otHours?: number | null;
}) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: params.userId,
        organizationId: params.organizationId,
      },
    },
    select: { id: true, deactivatedAt: true },
  });
  if (!membership || membership.deactivatedAt) {
    throw new Error("Employee not found in this workspace.");
  }

  const workDate = new Date(params.workDate);
  workDate.setUTCHours(12, 0, 0, 0);
  const now = new Date();
  const punchStatuses: AttendanceDayStatus[] = ["PRESENT", "HALF_DAY", "SHORT_LEAVE"];
  const setsCheckIn = punchStatuses.includes(params.status);
  const otHours =
    params.otHours != null && Number.isFinite(params.otHours)
      ? Math.max(0, params.otHours)
      : 0;

  return prisma.attendanceRecord.upsert({
    where: {
      organizationId_userId_workDate: {
        organizationId: params.organizationId,
        userId: params.userId,
        workDate,
      },
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      workDate,
      status: params.status,
      method: "WEB",
      notes: params.notes?.trim() || null,
      markedById: params.actorUserId,
      verifyStatus: "VERIFIED",
      verifiedById: params.actorUserId,
      verifiedAt: now,
      otHours,
      checkInAt: setsCheckIn ? now : null,
    },
    update: {
      status: params.status,
      notes: params.notes?.trim() || null,
      markedById: params.actorUserId,
      verifyStatus: "VERIFIED",
      verifiedById: params.actorUserId,
      verifiedAt: now,
      otHours,
      ...(setsCheckIn ? {} : { checkInAt: null }),
    },
  });
}
