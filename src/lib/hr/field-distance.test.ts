import { describe, expect, it } from "vitest";
import {
  recordedRouteDistance,
  type FieldDistancePoint,
} from "@/lib/hr/field-distance";

function points(count: number, intervalMs = 45_000): FieldDistancePoint[] {
  const start = Date.parse("2026-10-21T04:00:00.000Z");
  return Array.from({ length: count }, (_, index) => ({
    geoLat: 19 + index * 0.0001,
    geoLng: 72.8,
    recordedAt: new Date(start + index * intervalMs),
    accuracyM: 12,
    isMockLocation: false,
  }));
}

describe("recorded route distance", () => {
  it("does not turn sparse points into a daily distance claim", () => {
    const result = recordedRouteDistance(points(4));
    expect(result.distanceKm).toBeNull();
    expect(result.acceptedPoints).toBe(4);
    expect(result.source).toBe("GPS_PINGS_WHILE_PAGE_OPEN");
    expect(result.timeZone).toBe("Asia/Kolkata");
  });

  it("calculates only a clearly labeled partial route from a continuous sample", () => {
    const result = recordedRouteDistance(points(5));
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.includedSegments).toBe(4);
    expect(result.omittedGaps).toBe(0);
  });

  it("omits long gaps, poor accuracy, and mock points", () => {
    const sample = points(6);
    sample[3] = { ...sample[3], recordedAt: new Date(sample[2].recordedAt.getTime() + 5 * 60_000) };
    sample[4] = { ...sample[4], accuracyM: 250 };
    sample[5] = { ...sample[5], isMockLocation: true };
    const result = recordedRouteDistance(sample);
    expect(result.distanceKm).toBeNull();
    expect(result.acceptedPoints).toBe(4);
    expect(result.omittedGaps).toBeGreaterThan(0);
  });
});
