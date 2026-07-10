import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { HR_OUT_OF_LOCATION_MESSAGE } from "@/lib/hr/hr-result";
import {
  listActiveHrWorkSites,
  resolveHrSiteGeo,
} from "@/lib/hr/sites";

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
) {
  const workDate = startOfToday();
  return prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      workDate,
      ...(siteId ? { siteId } : {}),
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
      checkInAt: new Date(),
      status: "PRESENT",
      method: params.method ?? (params.geoLat != null ? "GEO" : "WEB"),
      geoLat: params.geoLat,
      geoLng: params.geoLng,
      geoFenceOk,
      faceVerified: params.method === "FACE",
    },
    update: {
      siteId: resolvedSiteId,
      checkInAt: new Date(),
      status: "PRESENT",
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

  return prisma.attendanceRecord.update({
    where: {
      organizationId_userId_workDate: {
        organizationId: user.organizationId,
        userId: user.id,
        workDate,
      },
    },
    data: { checkOutAt: new Date() },
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
  const [
    presentToday,
    pendingLeave,
    fieldCheckInsToday,
    openJobs,
    activeCandidates,
  ] = await Promise.all([
    prisma.attendanceRecord.count({
      where: { organizationId, workDate, status: "PRESENT" },
    }),
    prisma.leaveRequest.count({
      where: { organizationId, status: "PENDING" },
    }),
    prisma.fieldCheckIn.count({
      where: {
        organizationId,
        checkedInAt: { gte: workDate },
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

  return {
    presentToday,
    pendingLeave,
    fieldCheckInsToday,
    openJobs,
    activeCandidates,
  };
}
