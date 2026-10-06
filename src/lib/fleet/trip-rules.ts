import { ASH_TONNES_PER_M3 } from "@/lib/fleet/types";

export type WeightPair = {
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  dykeFixCount: number;
  payloadMinKg: number;
  payloadMaxKg: number;
};

/** Both weights exist and no GPS fix landed inside the ash dyke. */
export function isGhostTrip(trip: Pick<WeightPair, "grossWeightKg" | "tareWeightKg" | "dykeFixCount">): boolean {
  if (trip.grossWeightKg == null || trip.tareWeightKg == null) return false;
  return trip.dykeFixCount <= 0;
}

/** Net load outside the dumper's allowed band, or tare heavier than gross. */
export function isPayloadAnomaly(trip: WeightPair): boolean {
  if (trip.grossWeightKg == null || trip.tareWeightKg == null) return false;
  const net = trip.grossWeightKg - trip.tareWeightKg;
  if (net <= 0) return true;
  return net < trip.payloadMinKg || net > trip.payloadMaxKg;
}

export function ashFromWeights(grossKg: number, tareKg: number): { ashTonnes: number; ashVolumeM3: number } | null {
  const net = grossKg - tareKg;
  if (net <= 0) return null;
  const ashTonnes = net / 1000;
  return { ashTonnes, ashVolumeM3: ashTonnes / ASH_TONNES_PER_M3 };
}
