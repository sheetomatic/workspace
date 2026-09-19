import { describe, expect, it } from "vitest";
import { DEMO_TRIAL_DAYS, demoTrialEndsAt } from "@/lib/demo-workspace";

describe("demoTrialEndsAt", () => {
  it("adds three calendar days by default", () => {
    const start = new Date("2026-09-19T06:00:00.000Z");
    const end = demoTrialEndsAt(start);
    expect(DEMO_TRIAL_DAYS).toBe(3);
    expect(end.toISOString()).toBe("2026-09-22T06:00:00.000Z");
  });
});
