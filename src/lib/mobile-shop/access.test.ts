import { describe, expect, it } from "vitest";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { canOpenMobileShop } from "@/lib/mobile-shop/kit-access";
import { canPreviewMobileShopWithoutLicense } from "@/lib/mobile-shop/preview-bypass";

describe("mobile shop access", () => {
  it("stays closed for owners, admins, and the rest of the team", () => {
    expect(canPreviewMobileShopWithoutLicense("OWNER")).toBe(false);
    expect(canPreviewMobileShopWithoutLicense("ADMIN")).toBe(false);
    expect(canPreviewMobileShopWithoutLicense("STAFF", true)).toBe(false);
    expect(
      canOpenMobileShop({ orgLicensed: false, memberKitKeys: [] }),
    ).toBe(false);
  });

  it("opens when the client kit is active", () => {
    expect(canOpenMobileShop({ orgLicensed: true, memberKitKeys: [] })).toBe(
      true,
    );
  });

  it("opens for the one person who was ticked, even if the client kit is off", () => {
    expect(
      canOpenMobileShop({
        orgLicensed: false,
        memberKitKeys: [MOBILE_SHOP_KIT_KEY],
      }),
    ).toBe(true);
  });
});
