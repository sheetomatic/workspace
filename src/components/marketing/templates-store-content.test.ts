import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplatesStoreContent, type PublicTemplateProduct } from "./templates-store-content";

const products: PublicTemplateProduct[] = [{ id: "fixture-template", slug: "inventory", name: "Inventory Template",
  type: "SHEETS", priceInr: 499, description: "A standard template copy", thumbnailUrl: null, purchasable: true }];
describe("Templates page is for one-time template copies only", () => {
  it("removes hosted subscription offers and category while retaining templates and cart", () => {
    const html = renderToStaticMarkup(createElement(TemplatesStoreContent, { products }));
    expect(html).not.toContain("Hosted Cloud Software");
    expect(html).not.toContain("Cloud Softwares");
    expect(html).not.toContain("Mobile Shop Counter");
    expect(html).not.toContain("Discuss this subscription");
    expect(html).toContain("Inventory Template");
    expect(html).toContain("Add to cart");
    expect(html).toContain("Your cart");
    expect(html).toContain("Google Sheets Based");
    expect(html).toContain("AppSheet Based");
  });
  it("retains the AppSheet category filter", () => {
    const html = renderToStaticMarkup(createElement(TemplatesStoreContent, { products, initialCategory: "appsheet" }));
    expect(html).not.toContain("Inventory Template");
    expect(html).toContain('aria-pressed="true">AppSheet Based');
  });
});
