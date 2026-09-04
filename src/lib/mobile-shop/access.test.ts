import { describe, expect, it } from "vitest";
import { canPreviewMobileShopWithoutLicense } from "@/lib/mobile-shop/preview-bypass";

describe("mobile shop preview license bypass", () => {
  it("lets OWNER and ADMIN open the shop without an ACTIVE license", () => {
    expect(canPreviewMobileShopWithoutLicense("OWNER")).toBe(true);
    expect(canPreviewMobileShopWithoutLicense("ADMIN")).toBe(true);
    expect(canPreviewMobileShopWithoutLicense("MANAGER")).toBe(false);
    expect(canPreviewMobileShopWithoutLicense("STAFF")).toBe(false);
    expect(canPreviewMobileShopWithoutLicense("VIEWER")).toBe(false);
  });

  it("lets a super-admin bypass even if membership role is lower", () => {
    expect(canPreviewMobileShopWithoutLicense("STAFF", true)).toBe(true);
  });
});
