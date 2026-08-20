import { describe, expect, it } from "vitest";
import { standardServiceCatalogSeeds } from "@/lib/leads/service-catalog";

describe("standard service catalog seeds", () => {
  it("includes website suite, Official WhatsApp yearly, and a 2,000 credit pack", () => {
    const seeds = standardServiceCatalogSeeds();
    expect(
      seeds.some(
        (item) =>
          item.serviceCategory === "EM Ready Suite" &&
          item.subCategory.includes("Starter") &&
          item.unitPrice === 4999,
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (item) =>
          item.subCategory.toLowerCase().includes("starter") &&
          item.subCategory.toLowerCase().includes("year") &&
          item.unitPrice === 5999,
      ),
    ).toBe(true);
    expect(
      seeds.some((item) => item.subCategory.includes("2,000")),
    ).toBe(true);
    expect(
      seeds.some((item) => item.serviceCategory === "Training"),
    ).toBe(true);
  });

  it("does not duplicate the same category + name", () => {
    const seeds = standardServiceCatalogSeeds();
    const keys = seeds.map(
      (item) => `${item.serviceCategory}|||${item.subCategory}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
