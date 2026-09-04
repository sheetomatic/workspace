import { describe, expect, it } from "vitest";
import { MOBILE_SHOP_HOME_ACTIONS } from "@/lib/mobile-shop/home-actions";
import { STOCK_IN_REASONS, STOCK_OUT_FORM_REASONS, STOCK_OUT_SALE_LINKS } from "@/lib/mobile-shop/reasons";

describe("mobile shop home actions", () => {
  it("puts stock in/out on the home row with sale, used phone, and repair", () => {
    expect(MOBILE_SHOP_HOME_ACTIONS.map((action) => action.label)).toEqual([
      "New sale",
      "Used phone",
      "Repair",
      "Stock in",
      "Stock out",
    ]);
    expect(MOBILE_SHOP_HOME_ACTIONS.every((action) => action.hi.length > 0)).toBe(
      true,
    );
  });
});

describe("mobile shop stock reasons", () => {
  it("covers purchase/return/transfer in and sale/part/supplier out", () => {
    expect(STOCK_IN_REASONS.map((reason) => reason.value)).toEqual([
      "PURCHASE",
      "CUSTOMER_RETURN",
      "TRANSFER_IN",
    ]);
    expect(STOCK_OUT_SALE_LINKS.map((link) => link.reason)).toEqual([
      "SALE",
      "USED_SALE",
      "ACCESSORY_SALE",
    ]);
    expect(STOCK_OUT_FORM_REASONS.map((reason) => reason.value)).toEqual([
      "PART_USED",
      "RETURN_TO_SUPPLIER",
    ]);
  });
});
