import type { HrSwapType, LeaveRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const WEEKLY_OFF_NOTES = "Weekly off";
const WEEKLY_OFF_SWAP_NOTES = "Weekly off (swap)";

function noonDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function sameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Default weekly off: Sunday (0) when Membership.weeklyOffDay is null. */
export function resolveWeeklyOffDay(weeklyOffDay: number | null | undefined) {
  if (weeklyOffDay == null || weeklyOffDay < 0 || weeklyOffDay > 6) {
    return 0;
  }
  return weeklyOffDay;
}

export async function listSwapRequests(
  organizationId: string,
  options?: { userId?: string; status?: LeaveRequestStatus },
) {
  return prisma.hrSwapRequest.findMany({
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

export async function submitSwapRequest(params: {
  organizationId: string;
  userId: string;
  swapType: HrSwapType;
  fromDate: Date;
  toDate: Date;
  reason?: string | null;
  leaveRequestId?: string | null;
}) {
  if (params.swapType !== "LEAVE_SWAP" && params.swapType !== "OFF_DAY_SWAP") {
    throw new Error("Swap type must be LEAVE_SWAP or OFF_DAY_SWAP.");
  }

  const fromDate = noonDate(params.fromDate);
  const toDate = noonDate(params.toDate);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Enter valid from and to dates.");
  }
  if (sameUtcDay(fromDate, toDate)) {
    throw new Error("From and to dates must be different.");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: params.userId,
        organizationId: params.organizationId,
      },
    },
    select: { id: true, deactivatedAt: true, weeklyOffDay: true },
  });
  if (!membership || membership.deactivatedAt) {
    throw new Error("Membership not found.");
  }

  // Ensure weeklyOffDay is set for OFF_DAY_SWAP (default Sunday).
  if (params.swapType === "OFF_DAY_SWAP" && membership.weeklyOffDay == null) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { weeklyOffDay: 0 },
    });
  }

  let leaveRequestId: string | null = params.leaveRequestId?.trim() || null;

  if (params.swapType === "LEAVE_SWAP") {
    // Prefer explicit leaveRequestId; else find single-day leave covering fromDate.
    let leave = leaveRequestId
      ? await prisma.leaveRequest.findFirst({
          where: {
            id: leaveRequestId,
            organizationId: params.organizationId,
            userId: params.userId,
            status: { in: ["PENDING", "APPROVED"] },
          },
        })
      : await prisma.leaveRequest.findFirst({
          where: {
            organizationId: params.organizationId,
            userId: params.userId,
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { lte: fromDate },
            endDate: { gte: fromDate },
          },
          orderBy: { createdAt: "desc" },
        });

    if (!leave) {
      throw new Error(
        "No pending or approved leave found on the from date to swap.",
      );
    }
    // Practical Phase 2: only single-day leave rows.
    if (!sameUtcDay(leave.startDate, leave.endDate)) {
      throw new Error(
        "Leave swap currently supports single-day leave requests only.",
      );
    }
    if (!sameUtcDay(leave.startDate, fromDate)) {
      throw new Error("From date must match the leave day being swapped.");
    }

    const toConflict = await prisma.leaveRequest.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: toDate },
        endDate: { gte: toDate },
        id: { not: leave.id },
      },
      select: { id: true },
    });
    if (toConflict) {
      throw new Error("You already have leave covering the target date.");
    }

    const toAttendance = await prisma.attendanceRecord.findUnique({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: params.userId,
          workDate: toDate,
        },
      },
      select: { status: true },
    });
    if (toAttendance?.status === "ON_LEAVE") {
      throw new Error("Target date is already marked ON_LEAVE.");
    }

    leaveRequestId = leave.id;
  }

  if (params.swapType === "OFF_DAY_SWAP") {
    const toAttendance = await prisma.attendanceRecord.findUnique({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: params.userId,
          workDate: toDate,
        },
      },
      select: { status: true },
    });
    if (toAttendance?.status === "ON_LEAVE") {
      throw new Error(
        "Cannot swap weekly off onto a day that is already ON_LEAVE.",
      );
    }
  }

  const overlapping = await prisma.hrSwapRequest.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      status: "PENDING",
      OR: [
        { fromDate: { in: [fromDate, toDate] } },
        { toDate: { in: [fromDate, toDate] } },
      ],
    },
    select: { id: true },
  });
  if (overlapping) {
    throw new Error("You already have a pending swap involving these dates.");
  }

  return prisma.hrSwapRequest.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      swapType: params.swapType,
      fromDate,
      toDate,
      reason: params.reason?.trim() || null,
      leaveRequestId,
    },
  });
}

export async function approveSwapRequest(params: {
  organizationId: string;
  requestId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  const request = await prisma.hrSwapRequest.findFirst({
    where: { id: params.requestId, organizationId: params.organizationId },
  });
  if (!request || request.status !== "PENDING") {
    throw new Error("Swap request not found or already reviewed.");
  }
  if (request.userId === params.reviewerId) {
    throw new Error("You cannot approve your own swap request.");
  }

  const fromDate = noonDate(request.fromDate);
  const toDate = noonDate(request.toDate);

  await prisma.$transaction(async (tx) => {
    await tx.hrSwapRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: params.reviewNotes?.trim() || null,
      },
    });

    if (request.swapType === "LEAVE_SWAP") {
      const leave = request.leaveRequestId
        ? await tx.leaveRequest.findFirst({
            where: {
              id: request.leaveRequestId,
              organizationId: params.organizationId,
              userId: request.userId,
              status: { in: ["PENDING", "APPROVED"] },
            },
          })
        : null;
      if (!leave) {
        throw new Error("Linked leave request is missing or no longer active.");
      }

      await tx.leaveRequest.update({
        where: { id: leave.id },
        data: { startDate: toDate, endDate: toDate },
      });

      // Clear ON_LEAVE on fromDate (only if it was leave-marked).
      const fromAtt = await tx.attendanceRecord.findUnique({
        where: {
          organizationId_userId_workDate: {
            organizationId: params.organizationId,
            userId: request.userId,
            workDate: fromDate,
          },
        },
      });
      if (fromAtt?.status === "ON_LEAVE") {
        await tx.attendanceRecord.delete({ where: { id: fromAtt.id } });
      }

      if (leave.status === "APPROVED") {
        const toAtt = await tx.attendanceRecord.findUnique({
          where: {
            organizationId_userId_workDate: {
              organizationId: params.organizationId,
              userId: request.userId,
              workDate: toDate,
            },
          },
          select: { status: true },
        });
        if (toAtt?.status === "ON_LEAVE") {
          throw new Error("Target date is already ON_LEAVE.");
        }
        await tx.attendanceRecord.upsert({
          where: {
            organizationId_userId_workDate: {
              organizationId: params.organizationId,
              userId: request.userId,
              workDate: toDate,
            },
          },
          create: {
            organizationId: params.organizationId,
            userId: request.userId,
            workDate: toDate,
            status: "ON_LEAVE",
            method: "WEB",
            notes: `Leave · ${leave.leaveType}`,
            markedById: params.reviewerId,
          },
          update: {
            status: "ON_LEAVE",
            notes: `Leave · ${leave.leaveType}`,
            markedById: params.reviewerId,
            checkInAt: null,
            checkOutAt: null,
          },
        });
      }
      return;
    }

    // OFF_DAY_SWAP: fromDate becomes work-eligible; toDate marked weekly off.
    const fromAtt = await tx.attendanceRecord.findUnique({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: request.userId,
          workDate: fromDate,
        },
      },
    });
    if (fromAtt?.status === "ON_LEAVE") {
      throw new Error("Cannot clear weekly off on a day that is ON_LEAVE.");
    }
    if (
      fromAtt &&
      fromAtt.status === "HOLIDAY" &&
      (fromAtt.notes?.startsWith(WEEKLY_OFF_NOTES) ||
        fromAtt.notes?.startsWith(WEEKLY_OFF_SWAP_NOTES))
    ) {
      await tx.attendanceRecord.delete({ where: { id: fromAtt.id } });
    } else if (fromAtt?.status === "HOLIDAY" && !fromAtt.notes?.startsWith("Holiday:")) {
      // Treat generic weekly-off style HOLIDAY as clearable.
      await tx.attendanceRecord.delete({ where: { id: fromAtt.id } });
    }

    const toAtt = await tx.attendanceRecord.findUnique({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: request.userId,
          workDate: toDate,
        },
      },
      select: { status: true },
    });
    if (toAtt?.status === "ON_LEAVE") {
      throw new Error("Cannot mark weekly off on a day that is ON_LEAVE.");
    }

    await tx.attendanceRecord.upsert({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: request.userId,
          workDate: toDate,
        },
      },
      create: {
        organizationId: params.organizationId,
        userId: request.userId,
        workDate: toDate,
        status: "HOLIDAY",
        method: "WEB",
        notes: WEEKLY_OFF_SWAP_NOTES,
        markedById: params.reviewerId,
      },
      update: {
        status: "HOLIDAY",
        notes: WEEKLY_OFF_SWAP_NOTES,
        markedById: params.reviewerId,
        checkInAt: null,
        checkOutAt: null,
      },
    });
  });

  return { ok: true as const };
}

export async function rejectSwapRequest(params: {
  organizationId: string;
  requestId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  const request = await prisma.hrSwapRequest.findFirst({
    where: { id: params.requestId, organizationId: params.organizationId },
  });
  if (!request || request.status !== "PENDING") {
    throw new Error("Swap request not found or already reviewed.");
  }
  if (request.userId === params.reviewerId) {
    throw new Error("You cannot reject your own swap request.");
  }

  await prisma.hrSwapRequest.update({
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
