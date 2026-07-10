import type { AttendanceExceptionType, LeaveRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

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

/** On approve: upsert PRESENT attendance for weekdays with OD/WFH tag in notes. */
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

  const dates = eachDateInclusive(request.startDate, request.endDate).filter(isWeekday);
  if (dates.length < 1) {
    throw new Error("Date range has no working days.");
  }

  const notes = exceptionNotes(request.exceptionType, request.reason);

  let appliedDays = 0;
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

    for (const workDate of dates) {
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
  });

  return { ok: true as const, days: appliedDays };
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
