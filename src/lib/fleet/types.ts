/** Yard rules. Tuned for ash dumpers, not highway trucks. */
export const FUEL_THEFT_DROP_LITERS = 10;
export const FUEL_THEFT_WINDOW_MS = 5 * 60 * 1000;
export const FUEL_THEFT_MAX_SPEED_KMH = 5;
export const FUEL_SLIP_VARIANCE = 0.05;
export const IDLE_WARNING_MS = 20 * 60 * 1000;
export const BREAKDOWN_MS = 45 * 60 * 1000;
export const SILO_QUEUE_DELAY_MS = 30 * 60 * 1000;
export const OFFLINE_ALERT_MS = 2 * 60 * 60 * 1000;
/** A cliff this large inside 30s is a dead sensor, not a siphon. */
export const SENSOR_DROP_FRACTION = 0.3;
export const SENSOR_DROP_MAX_MS = 30 * 1000;
/** Ash bulk density used for volume. */
export const ASH_TONNES_PER_M3 = 0.85;
export const SYNC_MAX_POINTS = 500;

export type LngLat = [number, number];

export type GeofenceShape =
  | { kind: "circle"; center: LngLat; radiusM: number }
  | { kind: "polygon"; ring: LngLat[] };

export type FuelSample = {
  recordedAt: Date;
  fuelLevelLiters: number;
  speedKmh: number;
};

export type FuelTheftHit = {
  from: Date;
  to: Date;
  dropLiters: number;
};

export type SensorFaultHit = {
  at: Date;
  dropLiters: number;
};

export function isGeofenceShape(value: unknown): value is GeofenceShape {
  if (!value || typeof value !== "object") return false;
  const shape = value as GeofenceShape;
  if (shape.kind === "circle") {
    return (
      Array.isArray(shape.center) &&
      shape.center.length === 2 &&
      Number.isFinite(shape.center[0]) &&
      Number.isFinite(shape.center[1]) &&
      Number.isFinite(shape.radiusM) &&
      shape.radiusM > 0
    );
  }
  if (shape.kind === "polygon") {
    return (
      Array.isArray(shape.ring) &&
      shape.ring.length >= 3 &&
      shape.ring.every(
        (p) =>
          Array.isArray(p) &&
          p.length === 2 &&
          Number.isFinite(p[0]) &&
          Number.isFinite(p[1]),
      )
    );
  }
  return false;
}
