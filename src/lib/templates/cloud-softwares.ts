import { listShippableShopKits } from "@/lib/addons/licensed-kits";

export type CloudSoftwareProduct = {
  id: string;
  key: string;
  name: string;
  icp: string;
  description: string;
  priceMonthlyInr: number;
  priceAnnualInr: number;
  thumbnailUrl: string;
};

/** Native Sheetomatic apps shown on /templates under Cloud Softwares — not Sheet copies. */
export function listCloudSoftwareCatalog(): CloudSoftwareProduct[] {
  return listShippableShopKits().map((kit) => ({
    id: kit.key,
    key: kit.key,
    name: kit.name,
    icp: kit.icp,
    description: kit.description,
    priceMonthlyInr: kit.priceMonthlyInr,
    priceAnnualInr: kit.priceAnnualInr,
    thumbnailUrl: "/brand/sheetomatic-logo-s-mark.png",
  }));
}
