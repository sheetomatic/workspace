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
    for (const file of [
      "mobile-shop-stock-forms.tsx",
      "mobile-shop-sale-form.tsx",
      "mobile-shop-accessories.tsx",
    ]) {
      const text = src(file);
      expect(text, file).toContain("Add / New");
      expect(text, file).toContain("data-ms-add-new");
    }
  });
});
