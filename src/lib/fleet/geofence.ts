import type { GeofenceShape, LngLat } from "@/lib/fleet/types";

const EARTH_M = 6_371_000;

/** Great-circle distance in metres. lng/lat are degrees. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ray cast. Ring need not repeat the first vertex. */
export function pointInRing(point: LngLat, ring: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function shapeContains(shape: GeofenceShape, point: LngLat): boolean {
  if (shape.kind === "circle") {
    return haversineMeters(shape.center, point) <= shape.radiusM;
  }
  return pointInRing(point, shape.ring);
}

/** Circle as a polygon so the yard map can stroke one path. */
export function circleRing(center: LngLat, radiusM: number, steps = 32): LngLat[] {
  const lat = (center[1] * Math.PI) / 180;
  const dLat = radiusM / 110540;
  const dLng = radiusM / (111320 * Math.cos(lat) || 1);
  const ring: LngLat[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    ring.push([center[0] + dLng * Math.cos(t), center[1] + dLat * Math.sin(t)]);
  }
  return ring;
}

export function shapeRing(shape: GeofenceShape): LngLat[] {
  return shape.kind === "circle" ? circleRing(shape.center, shape.radiusM) : shape.ring;
}
