import { describe, expect, it } from "vitest";
import {
  footerCompanyLinks,
  footerProductLinks,
  mainNav,
} from "@/app/page-content";
import sitemap from "@/app/sitemap";

describe("marketing nav", () => {
  it("drops Add-ons from header and footer; Templates is the marketing home", () => {
    const surfaces = [...mainNav, ...footerCompanyLinks, ...footerProductLinks];
    expect(surfaces.some((item) => item.href === "/addons")).toBe(false);
    expect(surfaces.some((item) => item.label === "Add-ons")).toBe(false);
    expect(mainNav.some((item) => item.href === "/templates")).toBe(true);
    expect(footerCompanyLinks.some((item) => item.href === "/templates")).toBe(true);
    expect(footerProductLinks.some((item) => item.href === "/templates")).toBe(true);
  });

  it("keeps Templates on the sitemap and omits /addons", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/templates"))).toBe(true);
    expect(urls.some((url) => url.includes("/addons"))).toBe(false);
  });
});
