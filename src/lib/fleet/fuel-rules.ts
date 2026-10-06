import {
  FUEL_SLIP_VARIANCE,
  FUEL_THEFT_DROP_LITERS,
  FUEL_THEFT_MAX_SPEED_KMH,
  FUEL_THEFT_WINDOW_MS,
  SENSOR_DROP_FRACTION,
  SENSOR_DROP_MAX_MS,
  type FuelSample,
  type FuelTheftHit,
  type SensorFaultHit,
} from "@/lib/fleet/types";

export type FuelAnalysis = {
  thefts: FuelTheftHit[];
  sensorFaults: SensorFaultHit[];
};

/**
 * Fuel theft: drop of more than 10 L inside 5 minutes while every sample
 * in that window is under 5 km/h.
 * A cliff larger than 30% of tank capacity inside 30 seconds is a dead
 * sensor (fly-ash dust), not a siphon. A dip that recovers inside 2 minutes
 * is the same class of bad reading.
 */
export function analyzeFuelWindow(
  samples: FuelSample[],
  fuelCapacityLiters: number,
): FuelAnalysis {
  const sorted = [...samples].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const thefts: FuelTheftHit[] = [];
  const sensorFaults: SensorFaultHit[] = [];
  const sensorAt = new Set<number>();

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const dt = b.recordedAt.getTime() - a.recordedAt.getTime();
    const drop = a.fuelLevelLiters - b.fuelLevelLiters;
    const cliff =
      drop > Math.max(FUEL_THEFT_DROP_LITERS, fuelCapacityLiters * SENSOR_DROP_FRACTION) &&
      dt >= 0 &&
      dt < SENSOR_DROP_MAX_MS;
    if (cliff) {
      sensorFaults.push({ at: b.recordedAt, dropLiters: round1(drop) });
      sensorAt.add(b.recordedAt.getTime());
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const dt = sorted[j].recordedAt.getTime() - sorted[i].recordedAt.getTime();
      if (dt > FUEL_THEFT_WINDOW_MS) break;
      if (dt < SENSOR_DROP_MAX_MS) continue;
      const drop = sorted[i].fuelLevelLiters - sorted[j].fuelLevelLiters;
      if (drop <= FUEL_THEFT_DROP_LITERS) continue;
      const window = sorted.slice(i, j + 1);
      if (window.some((p) => sensorAt.has(p.recordedAt.getTime()))) continue;
      if (window.some((p) => p.speedKmh >= FUEL_THEFT_MAX_SPEED_KMH)) continue;
      if (fuelRecovers(sorted, j, sorted[i].fuelLevelLiters)) continue;
      thefts.push({
        from: sorted[i].recordedAt,
        to: sorted[j].recordedAt,
        dropLiters: round1(drop),
      });
      i = j;
      break;
    }
  }

  return { thefts: dedupeThefts(thefts), sensorFaults };
}

function fuelRecovers(sorted: FuelSample[], fromIndex: number, baseline: number): boolean {
  const start = sorted[fromIndex].recordedAt.getTime();
  for (let k = fromIndex + 1; k < sorted.length; k++) {
    const dt = sorted[k].recordedAt.getTime() - start;
    if (dt > 2 * 60 * 1000) break;
    if (sorted[k].fuelLevelLiters >= baseline - 2) return true;
  }
  return false;
}

function dedupeThefts(hits: FuelTheftHit[]): FuelTheftHit[] {
  const out: FuelTheftHit[] = [];
  for (const hit of hits) {
    const prev = out[out.length - 1];
    if (prev && hit.from.getTime() <= prev.to.getTime()) {
      if (hit.dropLiters > prev.dropLiters) out[out.length - 1] = hit;
      continue;
    }
    out.push(hit);
  }
  return out;
}

/** Fraction 0–1. Null when the slip is not a positive fill. */
export function fuelSlipVariance(slipLiters: number, sensorDeltaLiters: number): number | null {
  if (!(slipLiters > 0) || !Number.isFinite(sensorDeltaLiters)) return null;
  return Math.abs(sensorDeltaLiters - slipLiters) / slipLiters;
}

export function slipIsFlagged(slipLiters: number, sensorDeltaLiters: number): boolean {
  const variance = fuelSlipVariance(slipLiters, sensorDeltaLiters);
  return variance != null && variance > FUEL_SLIP_VARIANCE;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
