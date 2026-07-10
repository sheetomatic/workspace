/** Encode visit geofence into purpose until dedicated columns land. */
const GEOFENCE_RE =
  /\[GEOFENCE:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\]/;

export type VisitGeofence = {
  geoLat: number;
  geoLng: number;
  geoFenceRadiusM: number;
};

export function encodeVisitGeofence(
  purpose: string | null | undefined,
  fence: VisitGeofence | null,
): string | null {
  const clean = (purpose ?? "").replace(GEOFENCE_RE, "").trim();
  if (!fence) return clean || null;
  const tag = `[GEOFENCE:${fence.geoLat},${fence.geoLng},${fence.geoFenceRadiusM}]`;
  return clean ? `${tag} ${clean}` : tag;
}

export function parseVisitGeofence(
  purpose: string | null | undefined,
): VisitGeofence | null {
  if (!purpose) return null;
  const match = purpose.match(GEOFENCE_RE);
  if (!match) return null;
  const geoLat = Number(match[1]);
  const geoLng = Number(match[2]);
  const geoFenceRadiusM = Number(match[3]);
  if (
    !Number.isFinite(geoLat) ||
    !Number.isFinite(geoLng) ||
    !Number.isFinite(geoFenceRadiusM) ||
    geoFenceRadiusM <= 0
  ) {
    return null;
  }
  return { geoLat, geoLng, geoFenceRadiusM };
}

export function displayVisitPurpose(purpose: string | null | undefined) {
  if (!purpose) return null;
  const clean = purpose.replace(GEOFENCE_RE, "").trim();
  return clean || null;
}

/** Haversine distance in metres. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isWithinVisitGeofence(
  lat: number,
  lng: number,
  fence: VisitGeofence,
): { ok: boolean; distanceM: number } {
  const distanceM = distanceMeters(lat, lng, fence.geoLat, fence.geoLng);
  return { ok: distanceM <= fence.geoFenceRadiusM, distanceM };
}

export const LIVE_PING_NOTE = "[LIVE_PING]";

export function isLivePingNote(note: string | null | undefined) {
  return (note ?? "").includes(LIVE_PING_NOTE);
}
