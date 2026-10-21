export const FIELD_DISTANCE_TIME_ZONE = "Asia/Kolkata";
export const MAX_DISTANCE_PING_GAP_MS = 3 * 60 * 1000;
export const MIN_DISTANCE_PINGS = 5;
export const MIN_DISTANCE_SPAN_MS = 3 * 60 * 1000;
const MAX_PLAUSIBLE_SPEED_MPS = 200 / 3.6;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const latitudeDelta = toRad(lat2 - lat1);
  const longitudeDelta = toRad(lng2 - lng1);
  const factor =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(factor));
}

export type FieldDistancePoint = {
  geoLat: number;
  geoLng: number;
  recordedAt: Date;
  accuracyM: number | null;
  isMockLocation: boolean | null;
};

export type RecordedRouteDistance = {
  distanceKm: number | null;
  acceptedPoints: number;
  includedSegments: number;
  omittedGaps: number;
  sampledFrom: Date | null;
  sampledThrough: Date | null;
  source: "GPS_PINGS_WHILE_PAGE_OPEN";
  timeZone: typeof FIELD_DISTANCE_TIME_ZONE;
};

/**
 * Sum only recorded, consecutive GPS ping segments with a short time gap.
 * This is a partial straight-line path estimate, never a full odometer total.
 */
export function recordedRouteDistance(
  points: FieldDistancePoint[],
): RecordedRouteDistance {
  const valid = points
    .filter(
      (point) =>
        Number.isFinite(point.geoLat) &&
        point.geoLat >= -90 &&
        point.geoLat <= 90 &&
        Number.isFinite(point.geoLng) &&
        point.geoLng >= -180 &&
        point.geoLng <= 180 &&
        (point.accuracyM == null || point.accuracyM <= 100) &&
        point.isMockLocation !== true &&
        Number.isFinite(point.recordedAt.getTime()),
    )
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  let meters = 0;
  let includedSegments = 0;
  let omittedGaps = 0;
  for (let index = 1; index < valid.length; index += 1) {
    const previous = valid[index - 1];
    const current = valid[index];
    const elapsedMs = current.recordedAt.getTime() - previous.recordedAt.getTime();
    if (elapsedMs <= 0 || elapsedMs > MAX_DISTANCE_PING_GAP_MS) {
      omittedGaps += 1;
      continue;
    }

    const segmentMeters = haversineMeters(
      previous.geoLat,
      previous.geoLng,
      current.geoLat,
      current.geoLng,
    );
    if (segmentMeters / (elapsedMs / 1000) > MAX_PLAUSIBLE_SPEED_MPS) {
      omittedGaps += 1;
      continue;
    }
    meters += segmentMeters;
    includedSegments += 1;
  }

  const spanMs =
    valid.length > 1
      ? valid[valid.length - 1].recordedAt.getTime() - valid[0].recordedAt.getTime()
      : 0;
  const enoughRecordedRoute =
    valid.length >= MIN_DISTANCE_PINGS &&
    includedSegments >= MIN_DISTANCE_PINGS - 1 &&
    spanMs >= MIN_DISTANCE_SPAN_MS;

  return {
    distanceKm: enoughRecordedRoute ? Math.round((meters / 1000) * 100) / 100 : null,
    acceptedPoints: valid.length,
    includedSegments,
    omittedGaps,
    sampledFrom: valid[0]?.recordedAt ?? null,
    sampledThrough: valid.at(-1)?.recordedAt ?? null,
    source: "GPS_PINGS_WHILE_PAGE_OPEN",
    timeZone: FIELD_DISTANCE_TIME_ZONE,
  };
}
