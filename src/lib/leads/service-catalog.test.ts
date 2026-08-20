import { describe, expect, it } from "vitest";
import {
  normalizeServiceCatalogLabel,
  serviceCatalogUniquenessKey,
  standardServiceCatalogSeeds,
  uniqueServiceCatalogSeeds,
} from "@/lib/leads/service-catalog";

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
    const keys = seeds.map((item) =>
      serviceCatalogUniquenessKey(item.serviceCategory, item.subCategory),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("treats punctuation and case as the same service", () => {
    expect(normalizeServiceCatalogLabel("EM Ready Starter (monthly)")).toBe(
      "em ready starter monthly",
    );
    expect(
      serviceCatalogUniquenessKey("1:1 Training", "Google AppSheet Suite"),
    ).toBe(serviceCatalogUniquenessKey("1 1 Training", "google appsheet suite"));
    expect(
      uniqueServiceCatalogSeeds([
        { serviceCategory: "Training", subCategory: "AppSheet", unitPrice: 1 },
        { serviceCategory: "training", subCategory: "appsheet", unitPrice: 2 },
      ]),
    ).toHaveLength(1);
  });
});
