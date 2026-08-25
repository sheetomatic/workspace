import { describe, expect, it } from "vitest";
import { parseMonthlyServiceClientInput } from "@/lib/billing/monthly-service-clients";

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
