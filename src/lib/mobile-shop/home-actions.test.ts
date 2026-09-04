import { describe, expect, it } from "vitest";
import { MOBILE_SHOP_HOME_ACTIONS } from "@/lib/mobile-shop/home-actions";

describe("mobile shop home actions", () => {
  it("ships five shop-floor taps, not a spreadsheet dump", () => {
    expect(MOBILE_SHOP_HOME_ACTIONS.map((action) => action.label)).toEqual([
      "New sale",
      "Used phone in",
      "Repair job",
      "Accessory sale",
      "Stock check",
    ]);
    expect(MOBILE_SHOP_HOME_ACTIONS.every((action) => action.hi.length > 0)).toBe(
      true,
    );
  });
});
