import { describe, expect, it } from "vitest";
import { bannerConfig, bannersSchema, defaultBanners } from "./marketing-banners";
describe("website banners", () => {
  it("keeps the own offer first and wires exact referral details", () => {
    expect(defaultBanners[0].description).toBe("No setup cost. Pay only for the services.");
    expect(defaultBanners[2].href).toBe("https://sunsed.com/?via=sheetomatic");
    expect(defaultBanners[2].description).toContain("SHEETOMATIC");
    expect(bannersSchema.safeParse(defaultBanners).success).toBe(true);
  });
  it.each(["javascript:alert(1)", "//evil.com", "/\\evil.com", "https://user:pass@host.com", "http://host.com"])("rejects unsafe href %s", href => {
    expect(bannersSchema.safeParse([{...defaultBanners[0],href}]).success).toBe(false);
  });
  it("preserves order and explicit removal of all banners", () => {
    expect(bannerConfig({websiteBanners:{version:2,banners:[]}})).toEqual({version:2,banners:[]});
    expect(bannerConfig(null).banners).toEqual(defaultBanners);
    expect(bannersSchema.safeParse(Array(13).fill(defaultBanners[0])).success).toBe(false);
  });
});
