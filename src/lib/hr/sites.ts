import { prisma } from "@/lib/db";

export type HrSiteGeo = {
  id: string | null;
  name: string;
  lat: number;
  lng: number;
  geoFenceRadiusM: number;
};

export async function listActiveHrWorkSites(organizationId: string) {
  return prisma.hrWorkSite.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function resolveHrSiteGeo(
  organizationId: string,
  siteId?: string | null,
): Promise<HrSiteGeo | null> {
  if (siteId) {
    const site = await prisma.hrWorkSite.findFirst({
      where: { id: siteId, organizationId, isActive: true },
    });
    if (!site) {
      return null;
    }
    return {
      id: site.id,
      name: site.name,
      lat: site.lat,
      lng: site.lng,
      geoFenceRadiusM: site.geoFenceRadiusM,
    };
  }

  const sites = await listActiveHrWorkSites(organizationId);
  if (sites.length === 1) {
    const site = sites[0]!;
    return {
      id: site.id,
      name: site.name,
      lat: site.lat,
      lng: site.lng,
      geoFenceRadiusM: site.geoFenceRadiusM,
    };
  }

  const settings = await prisma.workspaceHrSettings.findUnique({
    where: { organizationId },
  });
  if (settings?.officeLat != null && settings.officeLng != null) {
    return {
      id: null,
      name: "Main office",
      lat: settings.officeLat,
      lng: settings.officeLng,
      geoFenceRadiusM: settings.geoFenceRadiusM,
    };
  }

  return null;
}

export async function getAttendanceSiteStats(
  organizationId: string,
  workDate: Date,
  siteId?: string | null,
) {
  const [memberCount, present, onLeave] = await Promise.all([
    prisma.membership.count({ where: { organizationId } }),
    prisma.attendanceRecord.count({
      where: {
        organizationId,
        workDate,
        checkInAt: { not: null },
        verifyStatus: { not: "REJECTED" },
        ...(siteId ? { siteId } : {}),
      },
    }),
    prisma.leaveRequest.count({
      where: {
        organizationId,
        status: "APPROVED",
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
    }),
  ]);

  const absent = Math.max(0, memberCount - present - onLeave);

  return { present, absent, onLeave, memberCount };
}
