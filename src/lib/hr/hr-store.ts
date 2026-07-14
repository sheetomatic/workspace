import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { HR_OUT_OF_LOCATION_MESSAGE } from "@/lib/hr/hr-result";
import {
  listActiveHrWorkSites,
  resolveHrSiteGeo,
} from "@/lib/hr/sites";
import {
  computeOtHoursFromCheckout,
  isCheckInLate,
} from "@/lib/hr/working-hours";

function startOfToday(timeZone = "Asia/Kolkata") {
  const formatted = new Date().toLocaleDateString("en-CA", { timeZone });
  return new Date(`${formatted}T12:00:00.000Z`);
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export async function getOrCreateHrSettings(organizationId: string) {
  return prisma.workspaceHrSettings.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
}

export async function listTodayAttendance(
  organizationId: string,
  siteId?: string | null,
  userId?: string,
) {
  const workDate = startOfToday();
  return prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      workDate,
      ...(siteId ? { siteId } : {}),
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { checkInAt: "desc" },
  });
}

export async function checkInAttendance(params: {
  user: SessionUser;
  siteId?: string | null;
  geoLat?: number;
  geoLng?: number;
  method?: "WEB" | "GEO" | "FACE";
}) {
  const workDate = startOfToday();
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      organizationId_userId_workDate: {
        organizationId: params.user.organizationId,
        userId: params.user.id,
        workDate,
      },
    },
  });

  if (existing?.checkInAt) {
    return existing;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: params.user.id,
        organizationId: params.user.organizationId,
      },
    },
    select: {
      geoFenceRequired: true,
      locationMode: true,
      primarySiteId: true,
    },
  });

  const locationMode = membership?.locationMode ?? "FIXED_SITE";
  const isFlexible = locationMode === "FLEXIBLE";

  // FIXED_SITE: prefer selected site, else primarySite, else org default.
  const preferredSiteId =
    params.siteId ??
    (!isFlexible ? membership?.primarySiteId ?? null : null);

  const [sites, siteGeo] = await Promise.all([
    listActiveHrWorkSites(params.user.organizationId),
    resolveHrSiteGeo(params.user.organizationId, preferredSiteId),
  ]);

  if (!isFlexible && sites.length > 1 && !preferredSiteId) {
    throw new Error("Select your work site before checking in.");
  }

  if (!isFlexible && !siteGeo) {
    throw new Error(
      "Office location is not configured yet. Ask your admin to add a work site in Team settings.",
    );
  }

  // FIXED_SITE always enforces fence when a site/office geo exists.
  // FLEXIBLE never blocks on fence (optional GPS still recorded).
  const enforceFence =
    !isFlexible &&
    siteGeo != null &&
    (membership?.geoFenceRequired === true ||
      sites.length > 0 ||
      siteGeo.id != null ||
      membership?.primarySiteId != null);

  let geoFenceOk: boolean | null = null;

  if (enforceFence && siteGeo) {
    if (params.geoLat == null || params.geoLng == null) {
      throw new Error(
        "GPS location is required. Tap “Use my location”, then check in with GPS.",
      );
    }
    const distance = haversineMeters(
      params.geoLat,
      params.geoLng,
      siteGeo.lat,
      siteGeo.lng,
    );
    geoFenceOk = distance <= siteGeo.geoFenceRadiusM;
    if (!geoFenceOk) {
      throw new Error(HR_OUT_OF_LOCATION_MESSAGE);
    }
  } else if (params.geoLat != null && params.geoLng != null && siteGeo) {
    const distance = haversineMeters(
      params.geoLat,
      params.geoLng,
      siteGeo.lat,
      siteGeo.lng,
    );
    geoFenceOk = distance <= siteGeo.geoFenceRadiusM;
    // FLEXIBLE: record geoFenceOk but never block.
    if (!isFlexible && !geoFenceOk) {
      throw new Error(HR_OUT_OF_LOCATION_MESSAGE);
    }
  }

  const resolvedSiteId = preferredSiteId ?? siteGeo?.id ?? null;
  const { resolveEmployeeTiming } = await import("@/lib/hr/shifts");
  const timing = await resolveEmployeeTiming(
    params.user.organizationId,
    params.user.id,
  );
  const checkInAt = new Date();
  const isLate = isCheckInLate({
    checkInAt,
    workStartTime: timing.workStartTime,
    lateGraceMinutes: timing.lateGraceMinutes,
  });

  return prisma.attendanceRecord.upsert({
    where: {
      organizationId_userId_workDate: {
        organizationId: params.user.organizationId,
        userId: params.user.id,
        workDate,
      },
    },
    create: {
      organizationId: params.user.organizationId,
      userId: params.user.id,
      siteId: resolvedSiteId,
      workDate,
      checkInAt,
      status: "PRESENT",
      verifyStatus: "PENDING",
      isLate,
      method: params.method ?? (params.geoLat != null ? "GEO" : "WEB"),
      geoLat: params.geoLat,
      geoLng: params.geoLng,
      geoFenceOk,
      faceVerified: params.method === "FACE",
    },
    update: {
      siteId: resolvedSiteId,
      checkInAt,
      status: "PRESENT",
      verifyStatus: "PENDING",
      verifiedById: null,
      verifiedAt: null,
      isLate,
      method: params.method ?? (params.geoLat != null ? "GEO" : "WEB"),
      geoLat: params.geoLat,
      geoLng: params.geoLng,
      geoFenceOk,
    },
    include: {
      user: { select: { name: true, email: true } },
      site: { select: { id: true, name: true } },
    },
  });
}

export async function checkOutAttendance(user: SessionUser) {
  const workDate = startOfToday();
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      organizationId_userId_workDate: {
        organizationId: user.organizationId,
        userId: user.id,
        workDate,
      },
    },
  });

  if (!existing?.checkInAt) {
    throw new Error("NOT_CHECKED_IN");
  }

  if (existing.checkOutAt) {
    return existing;
  }

  const checkOutAt = new Date();
  const [{ resolveEmployeeTiming }, profile] = await Promise.all([
    import("@/lib/hr/shifts"),
    prisma.employeeProfile.findFirst({
      where: { organizationId: user.organizationId, userId: user.id },
      select: { collarCategory: true },
    }),
  ]);
  const timing = await resolveEmployeeTiming(user.organizationId, user.id);

  let otHours = existing.otHours ?? 0;
  if (profile?.collarCategory === "BLUE") {
    const autoOt = computeOtHoursFromCheckout({
      checkOutAt,
      workStartTime: timing.workStartTime,
      workEndTime: timing.workEndTime,
    });
    otHours = Math.max(otHours, autoOt);
  }

  return prisma.attendanceRecord.update({
    where: {
      organizationId_userId_workDate: {
        organizationId: user.organizationId,
        userId: user.id,
        workDate,
      },
    },
    data: { checkOutAt, otHours },
  });
}

export async function listPendingAttendanceVerifications(organizationId: string) {
  return prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      verifyStatus: "PENDING",
      status: { in: ["PRESENT", "HALF_DAY", "SHORT_LEAVE"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: [{ workDate: "desc" }, { checkInAt: "desc" }],
    take: 100,
  });
}

export async function verifyAttendanceRecord(params: {
  organizationId: string;
  recordId: string;
  reviewerId: string;
  approve: boolean;
  otHours?: number | null;
  notes?: string | null;
}) {
  const existing = await prisma.attendanceRecord.findFirst({
    where: { id: params.recordId, organizationId: params.organizationId },
    select: { id: true, verifyStatus: true, notes: true, otHours: true },
  });
  if (!existing) {
    throw new Error("Attendance record not found.");
  }
  if (existing.verifyStatus !== "PENDING") {
    throw new Error("This attendance record is not pending verification.");
  }

  const now = new Date();
  if (params.approve) {
    return prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        verifyStatus: "VERIFIED",
        verifiedById: params.reviewerId,
        verifiedAt: now,
        ...(params.otHours != null && Number.isFinite(params.otHours)
          ? { otHours: Math.max(0, params.otHours) }
          : {}),
        ...(params.notes?.trim()
          ? { notes: params.notes.trim() }
          : {}),
      },
    });
  }

  return prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      verifyStatus: "REJECTED",
      verifiedById: params.reviewerId,
      verifiedAt: now,
      status: "ABSENT",
      notes: params.notes?.trim() || existing.notes || "Check-in rejected by manager",
      otHours: 0,
    },
  });
}

export async function listLeaveRequests(organizationId: string, userId?: string) {
  return prisma.leaveRequest.findMany({
    where: {
      organizationId,
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Leave balances for one user (ensures defaults for the year). */
export async function getLeaveBalancesForUser(
  organizationId: string,
  userId: string,
  year = new Date().getFullYear(),
) {
  const { listLeaveBalances } = await import("@/lib/hr/payroll");
  return listLeaveBalances(organizationId, userId, year);
}

/**
 * Balances for the current year. Staff: self only. Managers: all active members.
 */
export async function listLeaveBalancesForPage(
  organizationId: string,
  options: { viewerUserId: string; includeAllMembers: boolean; year?: number },
) {
  const year = options.year ?? new Date().getFullYear();
  const { ensureLeaveBalances } = await import("@/lib/hr/payroll");

  if (!options.includeAllMembers) {
    await ensureLeaveBalances(organizationId, options.viewerUserId, year);
    const rows = await prisma.leaveBalance.findMany({
      where: { organizationId, userId: options.viewerUserId, year },
      orderBy: { leaveType: "asc" },
    });
    return rows.map((row) => ({
      ...row,
      remainingDays: row.balanceDays - row.usedDays,
      user: null as { id: string; name: string | null; email: string } | null,
    }));
  }

  const members = await prisma.membership.findMany({
    where: {
      organizationId,
      deactivatedAt: null,
      role: { not: "VIEWER" },
    },
    select: {
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  for (const member of members) {
    await ensureLeaveBalances(organizationId, member.userId, year);
  }

  const rows = await prisma.leaveBalance.findMany({
    where: {
      organizationId,
      year,
      userId: { in: members.map((m) => m.userId) },
    },
    orderBy: [{ userId: "asc" }, { leaveType: "asc" }],
  });

  const userById = new Map(members.map((m) => [m.userId, m.user]));
  return rows.map((row) => ({
    ...row,
    remainingDays: row.balanceDays - row.usedDays,
    user: userById.get(row.userId) ?? null,
  }));
}

export async function listFieldCheckIns(organizationId: string, limit = 30) {
  return prisma.fieldCheckIn.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      visit: { select: { clientName: true, status: true } },
      photoAttachment: { select: { id: true, fileName: true, mimeType: true } },
    },
    orderBy: { checkedInAt: "desc" },
    take: limit,
  });
}

export async function listFieldVisits(organizationId: string) {
  return prisma.fieldVisit.findMany({
    where: { organizationId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      checkIns: { orderBy: { checkedInAt: "desc" }, take: 1 },
    },
    orderBy: { plannedAt: "desc" },
    take: 40,
  });
}

export async function listJobOpenings(organizationId: string) {
  return prisma.jobOpening.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { candidates: true } },
    },
  });
}

export async function listCandidates(organizationId: string) {
  return prisma.candidate.findMany({
    where: { organizationId },
    include: {
      jobOpening: { select: { title: true } },
      owner: { select: { name: true } },
      documents: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getHrDashboardStats(organizationId: string) {
  const workDate = startOfToday();
  const todayYmd = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const dayStart = new Date(`${todayYmd}T00:00:00.000+05:30`);
  const dayEnd = new Date(`${todayYmd}T23:59:59.999+05:30`);
  const [
    activeMembers,
    todayRecords,
    approvedLeavesToday,
    approvedExceptionsToday,
    pendingLeave,
    fieldCheckInsToday,
    openJobs,
    activeCandidates,
  ] = await Promise.all([
    prisma.membership.findMany({
      where: {
        organizationId,
        deactivatedAt: null,
        role: { not: "VIEWER" },
      },
      select: { userId: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { organizationId, workDate },
      select: {
        userId: true,
        status: true,
        notes: true,
        checkInAt: true,
        verifyStatus: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: "APPROVED",
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
      select: { userId: true },
    }),
    prisma.attendanceExceptionRequest.findMany({
      where: {
        organizationId,
        status: "APPROVED",
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
      select: { userId: true, exceptionType: true },
    }),
    prisma.leaveRequest.count({
      where: { organizationId, status: "PENDING" },
    }),
    prisma.fieldCheckIn.count({
      where: {
        organizationId,
        checkedInAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.jobOpening.count({ where: { organizationId, isOpen: true } }),
    prisma.candidate.count({
      where: {
        organizationId,
        stage: { notIn: ["HIRED", "REJECTED"] },
      },
    }),
  ]);

  const activeUserIds = new Set(activeMembers.map((member) => member.userId));
  const presentUserIds = new Set<string>();
  const odUserIds = new Set<string>();
  const wfhUserIds = new Set<string>();
  const leaveUserIds = new Set<string>();
  const holidayUserIds = new Set<string>();

  for (const record of todayRecords) {
    if (!activeUserIds.has(record.userId) || record.verifyStatus === "REJECTED") {
      continue;
    }
    const notes = record.notes ?? "";
    if (record.status === "HOLIDAY") {
      holidayUserIds.add(record.userId);
      continue;
    }
    if (record.status === "ON_LEAVE") {
      leaveUserIds.add(record.userId);
      continue;
    }
    if (record.status === "PRESENT") {
      if (notes.startsWith("[OD]")) {
        odUserIds.add(record.userId);
      } else if (notes.startsWith("[WFH]")) {
        wfhUserIds.add(record.userId);
      } else {
        presentUserIds.add(record.userId);
      }
    } else if (record.status === "HALF_DAY" || record.status === "SHORT_LEAVE") {
      presentUserIds.add(record.userId);
    }
  }

  for (const leave of approvedLeavesToday) {
    if (activeUserIds.has(leave.userId)) {
      leaveUserIds.add(leave.userId);
    }
  }

  for (const exception of approvedExceptionsToday) {
    if (!activeUserIds.has(exception.userId)) {
      continue;
    }
    if (exception.exceptionType === "OD") {
      odUserIds.add(exception.userId);
    } else {
      wfhUserIds.add(exception.userId);
    }
  }

  const accountedUserIds = new Set([
    ...presentUserIds,
    ...odUserIds,
    ...wfhUserIds,
    ...leaveUserIds,
    ...holidayUserIds,
  ]);
  const absentToday = Math.max(0, activeUserIds.size - accountedUserIds.size);

  return {
    presentToday: presentUserIds.size,
    absentToday,
    odToday: odUserIds.size,
    wfhToday: wfhUserIds.size,
    onLeaveToday: leaveUserIds.size,
    holidayToday: holidayUserIds.size,
    activeHeadcount: activeUserIds.size,
    pendingLeave,
    fieldCheckInsToday,
    openJobs,
    activeCandidates,
  };
}
