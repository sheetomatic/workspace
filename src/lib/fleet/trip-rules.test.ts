import { describe, expect, it } from "vitest";
import { haversineMeters, shapeContains } from "@/lib/fleet/geofence";
import { ashFromWeights, isGhostTrip, isPayloadAnomaly } from "@/lib/fleet/trip-rules";

describe("geofence", () => {
  const yard = {
    kind: "polygon" as const,
    ring: [
      [82.7, 24.2],
      [82.71, 24.2],
      [82.71, 24.21],
      [82.7, 24.21],
    ],
  };

  it("contains a point inside the ring", () => {
    expect(shapeContains(yard, [82.705, 24.205])).toBe(true);
  });

  it("excludes a point outside the ring", () => {
    expect(shapeContains(yard, [82.72, 24.205])).toBe(false);
  });

  it("contains a point inside a circle", () => {
    const circle = { kind: "circle" as const, center: [82.695, 24.205] as [number, number], radiusM: 140 };
    expect(shapeContains(circle, [82.695, 24.205])).toBe(true);
    expect(haversineMeters(circle.center, [82.7, 24.205])).toBeGreaterThan(140);
    expect(shapeContains(circle, [82.7, 24.205])).toBe(false);
  });
});

describe("trips", () => {
  it("marks a weighed trip with no dyke fix as a ghost", () => {
    expect(isGhostTrip({ grossWeightKg: 50000, tareWeightKg: 22000, dykeFixCount: 0 })).toBe(true);
    expect(isGhostTrip({ grossWeightKg: 50000, tareWeightKg: 22000, dykeFixCount: 3 })).toBe(false);
  });

  it("flags a net load outside the dumper band", () => {
    expect(
      isPayloadAnomaly({
        grossWeightKg: 70000,
        tareWeightKg: 20000,
        dykeFixCount: 2,
        payloadMinKg: 15000,
        payloadMaxKg: 32000,
      }),
    ).toBe(true);
  });

  it("turns net kilograms into tonnes and volume", () => {
    const ash = ashFromWeights(54800, 22400);
    expect(ash?.ashTonnes).toBeCloseTo(32.4);
    expect(ash?.ashVolumeM3).toBeGreaterThan(30);
  });
});
