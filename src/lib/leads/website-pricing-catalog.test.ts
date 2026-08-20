import { describe, expect, it } from "vitest";
import {
  computeWebsitePricingLineTotal,
  findWebsitePricingProduct,
  isWebsitePricingCatalogId,
  listWebsitePricingProducts,
} from "@/lib/leads/website-pricing-catalog";

describe("website pricing catalog for quotations", () => {
  it("lists suite, module, and setup options from /pricing", () => {
    const products = listWebsitePricingProducts();
    expect(products.some((item) => item.id.includes("em_ready_starter"))).toBe(
      true,
    );
    expect(products.some((item) => item.id.includes("module_whatsapp"))).toBe(
      true,
    );
    expect(products.some((item) => item.id.includes("workspace_build"))).toBe(
      true,
    );
    expect(products.some((item) => item.id.includes("product_setup"))).toBe(
      true,
    );
    expect(
      products.some((item) => item.id.includes("official-starter-yearly")),
    ).toBe(true);
    expect(products.some((item) => item.id.includes("credits_2000"))).toBe(
      true,
    );
    expect(products.every((item) => isWebsitePricingCatalogId(item.id))).toBe(
      true,
    );
  });

  it("prefills Starter monthly with website list price and extra seat rate", () => {
    const starter = findWebsitePricingProduct(
      "web:suite:em_ready_starter:monthly",
    );
    expect(starter?.defaultAmount).toBe(4999);
    expect(starter?.defaultPerUserCost).toBe(599);
    expect(starter?.defaultUsers).toBe(8);
  });

  it("calculates line total from per-user cost and user count", () => {
    expect(
      computeWebsitePricingLineTotal({
        amount: "10000",
        perUserCost: "300",
        users: "12",
      }),
    ).toBe(13600);
    expect(
      computeWebsitePricingLineTotal({
        amount: "",
        perUserCost: "499",
        users: "20",
      }),
    ).toBe(9980);
    expect(
      computeWebsitePricingLineTotal({
        amount: "4999",
        perUserCost: "",
        users: "",
      }),
    ).toBe(4999);
  });

  it("prefills Official WhatsApp yearly and leaves credit pack amount blank", () => {
    const yearly = findWebsitePricingProduct(
      "web:whatsapp:official-starter-yearly",
    );
    expect(yearly?.defaultAmount).toBe(5999);
    expect(yearly?.period).toBe("annual");
    const credits = findWebsitePricingProduct("web:whatsapp:credits_2000");
    expect(credits?.name).toContain("2,000");
    expect(credits?.defaultAmount).toBe(0);
  });
});
