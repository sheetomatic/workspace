import { describe, expect, it } from "vitest";
import {
  MOBILE_SHOP_HOME_ACTIONS,
  MOBILE_SHOP_NAV_BAR,
  MOBILE_SHOP_NAV_LINKS,
  MOBILE_SHOP_NAV_MORE,
} from "@/lib/mobile-shop/home-actions";
import { STOCK_IN_REASONS, STOCK_OUT_FORM_REASONS, STOCK_OUT_SALE_LINKS } from "@/lib/mobile-shop/reasons";

describe("mobile shop home actions", () => {
  it("puts five equal-weight apps on the home grid, with no standalone Out", () => {
    expect(MOBILE_SHOP_HOME_ACTIONS.map((action) => action.label)).toEqual([
      "New sale",
      "Used sale",
      "Repair",
      "Accessories",
      "Stock in",
    ]);
    expect(MOBILE_SHOP_HOME_ACTIONS.map((action) => action.href)).toEqual([
      "/app/mobile-shop/sales",
      "/app/mobile-shop/sales?type=used",
      "/app/mobile-shop/repairs",
      "/app/mobile-shop/accessories",
      "/app/mobile-shop/stock-in",
    ]);
    expect(MOBILE_SHOP_HOME_ACTIONS).toHaveLength(5);
    expect(MOBILE_SHOP_HOME_ACTIONS.every((action) => action.hi.length > 0)).toBe(
      true,
    );
    expect(
      MOBILE_SHOP_HOME_ACTIONS.some((action) => action.href.includes("stock-out")),
    ).toBe(false);
  });

  it("keeps a short phone bar without Used, Acc, or Out", () => {
    expect(MOBILE_SHOP_NAV_BAR.map((link) => link.label)).toEqual([
      "Home",
      "Sale",
      "Stock in",
      "Repair",
    ]);
    expect(MOBILE_SHOP_NAV_MORE.map((link) => link.label)).toEqual([
      "Stock",
      "Accessories",
      "Used phone in",
    ]);
    const barLabels: string[] = MOBILE_SHOP_NAV_BAR.map((link) => link.label);
    expect(barLabels).not.toContain("Used");
    expect(barLabels).not.toContain("Acc");
    expect(barLabels).not.toContain("Out");
    expect(MOBILE_SHOP_NAV_BAR.some((link) => link.href.includes("used-in"))).toBe(
      false,
    );
    expect(MOBILE_SHOP_NAV_LINKS.map((link) => link.label)).not.toContain("Acc");
    expect(MOBILE_SHOP_NAV_LINKS.find((link) => link.label === "Stock")?.exact).toBe(
      true,
    );
    expect(MOBILE_SHOP_NAV_LINKS.some((link) => link.href.includes("stock-out"))).toBe(
      false,
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
