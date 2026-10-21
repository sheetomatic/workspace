import { prisma } from "@/lib/db";
import {
  haversineMeters,
  recordedRouteDistance,
  type RecordedRouteDistance,
} from "@/lib/hr/field-distance";
export { haversineMeters } from "@/lib/hr/field-distance";

/** Minimum seconds between successive pings per user (light rate limit). */
export const FIELD_PING_MIN_INTERVAL_SEC = 30;

/** IST calendar day bounds as UTC Date range for queries. */
export function istDayBounds(date = new Date()): { start: Date; end: Date } {
  const ymd = date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const start = new Date(`${ymd}T00:00:00.000+05:30`);
  const end = new Date(`${ymd}T23:59:59.999+05:30`);
  return { start, end };
}

export async function postFieldLocationPing(params: {
  organizationId: string;
  userId: string;
  geoLat: number;
  geoLng: number;
  accuracyM?: number | null;
  batteryPct?: number | null;
  isMockLocation?: boolean | null;
}) {
  if (!Number.isFinite(params.geoLat) || !Number.isFinite(params.geoLng)) {
    throw new Error("GPS latitude and longitude are required.");
  }
  if (params.geoLat < -90 || params.geoLat > 90 || params.geoLng < -180 || params.geoLng > 180) {
    throw new Error("Invalid GPS coordinates.");
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

  const latest = await prisma.fieldLocationPing.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
    },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  if (latest) {
    const elapsedMs = Date.now() - latest.recordedAt.getTime();
    if (elapsedMs < FIELD_PING_MIN_INTERVAL_SEC * 1000) {
      const waitSec = Math.ceil(
        (FIELD_PING_MIN_INTERVAL_SEC * 1000 - elapsedMs) / 1000,
      );
      throw new Error(
        `Rate limited — wait ${waitSec}s before the next location ping.`,
      );
    }
  }

  const batteryPct =
    params.batteryPct != null && Number.isFinite(params.batteryPct)
      ? Math.max(0, Math.min(100, Math.round(params.batteryPct)))
      : null;

  return prisma.fieldLocationPing.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      geoLat: params.geoLat,
      geoLng: params.geoLng,
      accuracyM:
        params.accuracyM != null && Number.isFinite(params.accuracyM)
          ? params.accuracyM
          : null,
      batteryPct,
      isMockLocation:
        params.isMockLocation === true
          ? true
          : params.isMockLocation === false
            ? false
            : null,
    },
  });
}

/** Manager board: all org pings for today (IST). */
export async function listTodayPings(organizationId: string) {
  const { start, end } = istDayBounds();
  return prisma.fieldLocationPing.findMany({
    where: {
      organizationId,
      recordedAt: { gte: start, lte: end },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { recordedAt: "desc" },
    take: 500,
  });
}

/**
 * Partial route estimates from pings captured while the Field page was open.
 * Check-ins are intentionally excluded because they are too sparse to imply
 * distance travelled between locations.
 */
export async function listTodayRecordedDistances(
  organizationId: string,
  userIds: string[],
): Promise<Record<string, RecordedRouteDistance>> {
  if (userIds.length === 0) return {};
  const { start, end } = istDayBounds();
  const rows = await prisma.fieldLocationPing.findMany({
    where: {
      organizationId,
      userId: { in: userIds },
      recordedAt: { gte: start, lte: end },
    },
    select: {
      userId: true,
      geoLat: true,
      geoLng: true,
      accuracyM: true,
      isMockLocation: true,
      recordedAt: true,
    },
    orderBy: [{ userId: "asc" }, { recordedAt: "asc" }],
  });

  const pointsByUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const points = pointsByUser.get(row.userId) ?? [];
    points.push(row);
    pointsByUser.set(row.userId, points);
  }
  return Object.fromEntries(
    userIds.map((userId) => [
      userId,
      recordedRouteDistance(pointsByUser.get(userId) ?? []),
    ]),
  );
}

/**
 * Staff trail for a calendar day.
 * Pass a Date (noon UTC of Y-M-D) or omit for today (IST).
 */
export async function listMyDayTrail(
  organizationId: string,
  userId: string,
  date?: Date,
) {
  let start: Date;
  let end: Date;
  if (date && !Number.isNaN(date.getTime())) {
    const ymd = date.toISOString().slice(0, 10);
    start = new Date(`${ymd}T00:00:00.000+05:30`);
    end = new Date(`${ymd}T23:59:59.999+05:30`);
  } else {
    ({ start, end } = istDayBounds());
  }

  return prisma.fieldLocationPing.findMany({
    where: {
      organizationId,
      userId,
      recordedAt: { gte: start, lte: end },
    },
    orderBy: { recordedAt: "asc" },
    take: 500,
  });
}

/** Validate check-in against optional FieldVisit geofence. Returns geoFenceOk or null if no fence. */
export function visitGeoFenceOk(params: {
  visitGeoLat: number | null | undefined;
  visitGeoLng: number | null | undefined;
  radiusM: number | null | undefined;
  checkLat: number;
  checkLng: number;
}): boolean | null {
  if (
    params.visitGeoLat == null ||
    params.visitGeoLng == null ||
    params.radiusM == null ||
    params.radiusM <= 0
  ) {
    return null;
  }
  const distance = haversineMeters(
    params.checkLat,
    params.checkLng,
    params.visitGeoLat,
    params.visitGeoLng,
  );
  return distance <= params.radiusM;
}
