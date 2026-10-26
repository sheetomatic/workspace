import { describe, expect, it } from "vitest";
import { tasksPurchaseTerm } from "./purchase-term";
describe("paid Tasks term", () => {
  it("grants the billed eight-seat monthly minimum", () => expect(tasksPurchaseTerm("monthly", 1, new Date("2026-01-01Z")).seats).toBe(8));
  it("does not extend the minimum to annual purchases", () => expect(tasksPurchaseTerm("yearly", 1, new Date("2026-01-01Z")).seats).toBe(1));
  it("clamps month end in IST rather than drifting into March", () => expect(tasksPurchaseTerm("monthly", 8, new Date("2026-01-31T15:00:00Z")).endsAt.toISOString()).toBe("2026-02-28T15:00:00.000Z"));
  it("clamps leap-year annual terms", () => expect(tasksPurchaseTerm("yearly", 9, new Date("2024-02-29T01:00:00Z")).endsAt.toISOString()).toBe("2025-02-28T01:00:00.000Z"));
  it.each([0, -1, 251, 1.5, NaN])("rejects invalid seat count %s", users => expect(() => tasksPurchaseTerm("monthly", users, new Date())).toThrow());
});
