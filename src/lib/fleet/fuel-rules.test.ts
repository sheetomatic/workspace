import { describe, expect, it } from "vitest";
import { analyzeFuelWindow, fuelSlipVariance, slipIsFlagged } from "@/lib/fleet/fuel-rules";
import type { FuelSample } from "@/lib/fleet/types";

function at(minutes: number, fuel: number, speed: number): FuelSample {
  return {
    recordedAt: new Date(Date.UTC(2026, 9, 6, 4, minutes, 0)),
    fuelLevelLiters: fuel,
    speedKmh: speed,
  };
}

describe("fuel theft", () => {
  it("flags a 16 L drop in 4 minutes while stopped", () => {
    const result = analyzeFuelWindow([at(0, 180, 0), at(4, 164, 0)], 400);
    expect(result.thefts).toHaveLength(1);
    expect(result.thefts[0].dropLiters).toBe(16);
  });

  it("ignores the same drop at road speed", () => {
    const result = analyzeFuelWindow([at(0, 180, 32), at(4, 164, 32)], 400);
    expect(result.thefts).toHaveLength(0);
  });

  it("ignores a drop under 10 litres", () => {
    const result = analyzeFuelWindow([at(0, 180, 0), at(4, 172, 0)], 400);
    expect(result.thefts).toHaveLength(0);
  });

  it("ignores a drop that spans more than 5 minutes", () => {
    const result = analyzeFuelWindow([at(0, 180, 0), at(6, 160, 0)], 400);
    expect(result.thefts).toHaveLength(0);
  });

  it("treats a 30-second cliff as a sensor fault", () => {
    const samples: FuelSample[] = [
      at(0, 300, 0),
      {
        recordedAt: new Date(Date.UTC(2026, 9, 6, 4, 0, 10)),
        fuelLevelLiters: 40,
        speedKmh: 0,
      },
    ];
    const result = analyzeFuelWindow(samples, 400);
    expect(result.thefts).toHaveLength(0);
    expect(result.sensorFaults).toHaveLength(1);
  });
});

describe("pump slip", () => {
  it("flags variance above 5 percent", () => {
    expect(slipIsFlagged(100, 90)).toBe(true);
    expect(fuelSlipVariance(100, 90)).toBeCloseTo(0.1);
  });

  it("accepts variance inside 5 percent", () => {
    expect(slipIsFlagged(100, 97)).toBe(false);
  });
});
