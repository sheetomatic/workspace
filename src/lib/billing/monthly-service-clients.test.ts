import { describe, expect, it } from "vitest";
import {
  parseMonthlyServiceClientInput,
  searchMonthlyServiceLeads,
} from "@/lib/billing/monthly-service-clients";

describe("parseMonthlyServiceClientInput", () => {
  it("defaults GWS training category and monthly rate", () => {
    const parsed = parseMonthlyServiceClientInput({
      name: "Neha",
      phone: "9876543210",
      category: "TRAINING_GWS",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.category).toBe("TRAINING_GWS");
    expect(parsed.value.monthlyRatePaise).toBe(1_500_000);
    expect(parsed.value.phone).toBe("919876543210");
  });

  it("keeps a provided start date for edits", () => {
    const parsed = parseMonthlyServiceClientInput({
      name: "Manpreet Singh",
      phone: "9811033073",
      category: "TRAINING_GWS",
      monthlyRateRupees: "15000",
      startedAt: "2026-08-25",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.startedAt.toISOString().slice(0, 10)).toBe("2026-08-25");
    expect(parsed.value.monthlyRatePaise).toBe(1_500_000);
  });

  it("rejects a missing phone", () => {
    expect(
      parseMonthlyServiceClientInput({
        name: "Neha",
        phone: "",
        category: "TRAINING_GWS",
      }).ok,
    ).toBe(false);
  });
});

describe("searchMonthlyServiceLeads", () => {
  it("does not query until the user types at least two characters", async () => {
    await expect(searchMonthlyServiceLeads("org_1", "N")).resolves.toEqual([]);
    await expect(searchMonthlyServiceLeads("org_1", " ")).resolves.toEqual([]);
  });
});
