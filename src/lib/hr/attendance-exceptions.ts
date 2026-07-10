import type { AttendanceExceptionType, LeaveRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureLeaveBalances } from "@/lib/hr/payroll";

function noonDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function eachDateInclusive(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = noonDate(start);
  const last = noonDate(end);
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

function isWeekend(date: Date) {
  return !isWeekday(date);
}

function exceptionNotes(type: AttendanceExceptionType, reason: string | null) {
  const tag = type === "OD" ? "OD" : "WFH";
  return reason?.trim() ? `[${tag}] ${reason.trim()}` : `[${tag}]`;
}

export async function listAttendanceExceptions(
  organizationId: string,
  options?: { userId?: string; status?: LeaveRequestStatus },
) {
  return prisma.attendanceExceptionRequest.findMany({
    where: {
      organizationId,
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function submitAttendanceException(params: {
  organizationId: string;
  userId: string;
  exceptionType: AttendanceExceptionType;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
}) {
  if (params.exceptionType !== "OD" && params.exceptionType !== "WFH") {
    throw new Error("Exception type must be OD or WFH.");
  }
  const startDate = noonDate(params.startDate);
  const endDate = noonDate(params.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Enter valid start and end dates.");
  }
  if (endDate < startDate) {
    throw new Error("End date must be on or after start date.");
  }

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
    throw new Error("Membership not found.");
  }

  // Light overlap guard: block another pending OD/WFH on the same dates.
  const overlapping = await prisma.attendanceExceptionRequest.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      status: "PENDING",
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true, exceptionType: true },
  });
  if (overlapping) {
    throw new Error(
      `You already have a pending ${overlapping.exceptionType} request overlapping these dates.`,
    );
  }

  return prisma.attendanceExceptionRequest.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      exceptionType: params.exceptionType,
      startDate,
      endDate,
      reason: params.reason?.trim() || null,
    },
  });
}

/**
 * On approve: upsert PRESENT for applicable days with OD/WFH tag.
 * WFH: weekdays only.
 * OD: weekdays + weekends; each weekend day credits +1 COMP_OFF balanceDays when COMP_OFF exists.
 */
export async function approveAttendanceException(params: {
  organizationId: string;
  requestId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  const request = await prisma.attendanceExceptionRequest.findFirst({
    where: { id: params.requestId, organizationId: params.organizationId },
  });
  if (!request || request.status !== "PENDING") {
    throw new Error("Exception request not found or already reviewed.");
  }
  if (request.userId === params.reviewerId) {
    throw new Error("You cannot approve your own OD/WFH request.");
  }

  const allDates = eachDateInclusive(request.startDate, request.endDate);
  const applyDates =
    request.exceptionType === "OD"
      ? allDates
      : allDates.filter(isWeekday);
  if (applyDates.length < 1) {
    throw new Error("Date range has no applicable days.");
  }

  const weekendOdDates =
    request.exceptionType === "OD" ? applyDates.filter(isWeekend) : [];
  const notes = exceptionNotes(request.exceptionType, request.reason);

  let appliedDays = 0;
  let compOffCredited = 0;

  await prisma.$transaction(async (tx) => {
    await tx.attendanceExceptionRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: params.reviewNotes?.trim() || null,
      },
    });

    for (const workDate of applyDates) {
      // Skip days already ON_LEAVE — do not overwrite approved leave with OD/WFH PRESENT.
      const existing = await tx.attendanceRecord.findUnique({
        where: {
          organizationId_userId_workDate: {
            organizationId: params.organizationId,
            userId: request.userId,
            workDate,
          },
        },
        select: { status: true },
      });
      if (existing?.status === "ON_LEAVE") {
        continue;
      }

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
          status: "PRESENT",
          method: "WEB",
          notes,
          markedById: params.reviewerId,
        },
        update: {
          status: "PRESENT",
          notes,
          markedById: params.reviewerId,
        },
      });
      appliedDays += 1;
    }

    // Weekend OD → credit COMP_OFF (+1 balanceDays per weekend day applied).
    if (weekendOdDates.length > 0) {
      const year = request.startDate.getUTCFullYear();
      // ensureLeaveBalances uses prisma root; call outside nested if needed — use tx upsert.
      const existingComp = await tx.leaveBalance.findUnique({
        where: {
          organizationId_userId_leaveType_year: {
            organizationId: params.organizationId,
            userId: request.userId,
            leaveType: "COMP_OFF",
            year,
          },
        },
      });
      // Only credit when COMP_OFF leave type row exists or can be created (enum always exists).
      // Policy: create/upsert COMP_OFF balance then increment.
      let credited = 0;
      for (const workDate of weekendOdDates) {
        const existing = await tx.attendanceRecord.findUnique({
          where: {
            organizationId_userId_workDate: {
              organizationId: params.organizationId,
              userId: request.userId,
              workDate,
            },
          },
          select: { status: true, notes: true },
        });
        // Count only days we actually marked PRESENT with OD notes (not skipped ON_LEAVE).
        if (existing?.status === "PRESENT" && existing.notes?.startsWith("[OD]")) {
          credited += 1;
        }
      }
      if (credited > 0) {
        if (existingComp) {
          await tx.leaveBalance.update({
            where: { id: existingComp.id },
            data: { balanceDays: { increment: credited } },
          });
        } else {
          await tx.leaveBalance.create({
            data: {
              organizationId: params.organizationId,
              userId: request.userId,
              leaveType: "COMP_OFF",
              year,
              balanceDays: credited,
              usedDays: 0,
            },
          });
        }
        compOffCredited = credited;
      }
    }
  });

  // Keep ensureLeaveBalances available for other types without fighting the credit.
  if (weekendOdDates.length > 0) {
    await ensureLeaveBalances(
      params.organizationId,
      request.userId,
      request.startDate.getUTCFullYear(),
    ).catch(() => undefined);
  }

  return { ok: true as const, days: appliedDays, compOffCredited };
}

export async function rejectAttendanceException(params: {
  organizationId: string;
  requestId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  const request = await prisma.attendanceExceptionRequest.findFirst({
    where: { id: params.requestId, organizationId: params.organizationId },
  });
  if (!request || request.status !== "PENDING") {
    throw new Error("Exception request not found or already reviewed.");
  }
  if (request.userId === params.reviewerId) {
    throw new Error("You cannot reject your own OD/WFH request.");
  }

  await prisma.attendanceExceptionRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      reviewedById: params.reviewerId,
      reviewedAt: new Date(),
      reviewNotes: params.reviewNotes?.trim() || null,
    },
  });

  return { ok: true as const };
}
