import { describe, expect, it } from "vitest";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import {
  CLOUD_SOFTWARES_CATEGORY_LABEL,
  TEMPLATES_CLOUD_HREF,
  TEMPLATE_STORE_CATEGORIES,
  parseTemplateCategoryParam,
  templateTypeToCategory,
} from "@/lib/templates/categories";
import {
  MOBILE_SHOP_COUNTER_FEATURES,
  MOBILE_SHOP_COUNTER_THUMB,
  listCloudSoftwareCatalog,
} from "@/lib/templates/cloud-softwares";

describe("templates store categories", () => {
  it("splits the catalog into Google Sheets Based, AppSheet Based, and Cloud Softwares", () => {
    expect(TEMPLATE_STORE_CATEGORIES.map((category) => category.label)).toEqual([
      "Google Sheets Based",
      "AppSheet Based",
      "Cloud Softwares",
    ]);
    expect(CLOUD_SOFTWARES_CATEGORY_LABEL).toBe("Cloud Softwares");
    expect(templateTypeToCategory("SHEETS")).toBe("sheets");
    expect(templateTypeToCategory("EXCEL")).toBe("sheets");
    expect(templateTypeToCategory("APPSHEET")).toBe("appsheet");
  });

  it("maps /addons leftovers to the Cloud Softwares templates URL", () => {
    expect(parseTemplateCategoryParam("cloud")).toBe("cloud");
    expect(parseTemplateCategoryParam("addons")).toBe("all");
    expect(TEMPLATES_CLOUD_HREF).toBe("/templates?category=cloud#cloud-softwares");
  });

  it("lists Mobile Shop Counter as Cloud Softwares, not a Sheet copy", () => {
    const cloud = listCloudSoftwareCatalog();
    expect(cloud).toHaveLength(1);
    expect(cloud[0]?.id).toBe(MOBILE_SHOP_KIT_KEY);
    expect(cloud[0]?.name).toBe("Mobile Shop Counter");
    expect(cloud[0]?.thumbnailUrl).toBe(MOBILE_SHOP_COUNTER_THUMB);
    expect(cloud[0]?.thumbnailUrl).toBe("/images/templates/mobile-shop-counter.png");
    expect(cloud[0]?.features).toEqual([...MOBILE_SHOP_COUNTER_FEATURES]);
    expect(cloud[0]?.features).toEqual(
      expect.arrayContaining([
        "New + used phones",
        "Repairs",
        "Accessories",
        "IMEI from stock",
        "Invoice stock-in",
        "Sale is the out",
        "Today numbers",
        "MOQ alerts",
      ]),
    );
  });
});
