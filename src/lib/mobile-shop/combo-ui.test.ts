import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../components/saas");

function src(file: string) {
  return readFileSync(path.join(root, file), "utf8");
}

describe("mobile shop visible Add / New", () => {
  it("puts a persistent Add / New control on ShopCombo, not only in typeahead", () => {
    const combo = src("mobile-shop-combo.tsx");
    expect(combo).toContain("data-ms-add-new");
    expect(combo).toContain("ms-shop-combo-add");
    expect(combo).toContain("Add / New");
    expect(combo).toContain("नया");
    expect(combo.indexOf("ms-shop-combo-add")).toBeLessThan(combo.indexOf("ms-shop-suggest"));
  });

  it("shows Add / New on stock-in, sale, and accessories floors", () => {
    expect(src("mobile-shop-stock-forms.tsx")).toContain("PhoneCascade");
    expect(src("mobile-shop-stock-forms.tsx")).toContain("ShopCombo");
    expect(src("mobile-shop-sale-form.tsx")).toContain("PhoneCascade");
    expect(src("mobile-shop-sale-form.tsx")).toContain("data-ms-add-new");
    expect(src("mobile-shop-sale-form.tsx")).toContain("Add / New");
    expect(src("mobile-shop-accessories.tsx")).toContain("Add / New");
    expect(src("mobile-shop-accessories.tsx")).toContain("data-ms-add-new");
  });

  it("keeps family, model, and color pickers each with Add / New via ShopCombo", () => {
    const cascade = src("mobile-shop-phone-cascade.tsx");
    expect(cascade).toContain("Family");
    expect(cascade).toContain("Model");
    expect(cascade).toContain("Color");
    expect(cascade.split("<ShopCombo").length).toBeGreaterThan(3);
    expect(cascade).toContain("ms-shop-chips");
    expect(src("mobile-shop-combo.tsx")).toContain("Add / New");
  });
});
