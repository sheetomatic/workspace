import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

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

export async function listTodayAttendance(organizationId: string) {
  const workDate = startOfToday();
  return prisma.attendanceRecord.findMany({
    where: { organizationId, workDate },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { checkInAt: "desc" },
  });
}

export async function checkInAttendance(params: {
  user: SessionUser;
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

  const settings = await getOrCreateHrSettings(params.user.organizationId);
  let geoFenceOk: boolean | null = null;

  if (
    params.geoLat != null &&
    params.geoLng != null &&
    settings.officeLat != null &&
    settings.officeLng != null
  ) {
    const distance = haversineMeters(
      params.geoLat,
      params.geoLng,
      settings.officeLat,
      settings.officeLng,
    );
    geoFenceOk = distance <= settings.geoFenceRadiusM;
  }

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
      checkInAt: new Date(),
      status: "PRESENT",
      method: params.method ?? (params.geoLat != null ? "GEO" : "WEB"),
      geoLat: params.geoLat,
      geoLng: params.geoLng,
      geoFenceOk,
    },
    include: {
      user: { select: { name: true, email: true } },
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
