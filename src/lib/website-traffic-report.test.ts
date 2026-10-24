import { describe, expect, it } from "vitest";
import { trafficDays, trafficWindow } from "./website-traffic-report";
describe("IST traffic reporting", () => {
  it("includes today and six preceding IST dates", () => {
    const now = new Date("2026-10-24T19:00:00Z");
    expect(trafficWindow(7, now).toISOString()).toBe("2026-10-18T18:30:00.000Z");
    const days = trafficDays([{ day: "2026-10-25", views: 2n }], 7, now);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ day: "2026-10-19", views: 0 });
    expect(days[6]).toEqual({ day: "2026-10-25", views: 2 });
  });
  it("renders zero history without fabricated visits across month boundaries", () => {
    const days = trafficDays([], 30, new Date("2026-11-01T00:00:00Z"));
    expect(days[0].day).toBe("2026-10-03");
    expect(days[29].day).toBe("2026-11-01");
    expect(days.every(day => day.views === 0)).toBe(true);
  });
});
