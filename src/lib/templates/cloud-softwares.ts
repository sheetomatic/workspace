import { MOBILE_SHOP_KIT_KEY, listShippableShopKits } from "@/lib/addons/licensed-kits";

export const MOBILE_SHOP_COUNTER_THUMB =
  "/images/templates/mobile-shop-counter.png";

/** Card bullets — human shop-floor language, not SKU jargon. */
export const MOBILE_SHOP_COUNTER_FEATURES = [
  "New + used phones",
  "Repairs",
  "Accessories",
  "IMEI from stock",
  "Invoice stock-in",
  "Sale is the out",
  "Today numbers",
  "MOQ alerts",
] as const;

export type CloudSoftwareProduct = {
  id: string;
  key: string;
  name: string;
  icp: string;
  description: string;
  features: readonly string[];
  priceMonthlyInr: number;
  priceAnnualInr: number;
  thumbnailUrl: string;
};

function featuresForKit(key: string): readonly string[] {
  if (key === MOBILE_SHOP_KIT_KEY) return MOBILE_SHOP_COUNTER_FEATURES;
  return [];
}

function thumbnailForKit(key: string): string {
  if (key === MOBILE_SHOP_KIT_KEY) return MOBILE_SHOP_COUNTER_THUMB;
  return "/brand/sheetomatic-logo-s-mark.png";
}

/** Native Sheetomatic apps shown on /templates under Cloud Softwares — not Sheet copies. */
export function listCloudSoftwareCatalog(): CloudSoftwareProduct[] {
  return listShippableShopKits().map((kit) => ({
    id: kit.key,
    key: kit.key,
    name: kit.name,
    icp: kit.icp,
    description: kit.description,
    features: featuresForKit(kit.key),
    priceMonthlyInr: kit.priceMonthlyInr,
    priceAnnualInr: kit.priceAnnualInr,
    thumbnailUrl: thumbnailForKit(kit.key),
  }));
}
