import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";

/** Mobile Shop opens only when the client kit is active, or this person was ticked. */
export function canOpenMobileShop(input: {
  orgLicensed: boolean;
  memberKitKeys?: string[] | null;
}) {
  if (input.orgLicensed) return true;
  return (input.memberKitKeys ?? []).includes(MOBILE_SHOP_KIT_KEY);
}

export function parseEnabledKitKeys(formData: FormData): string[] {
  const raw = formData.getAll("kitKeys").map((value) => value.toString());
  return raw.includes(MOBILE_SHOP_KIT_KEY) ? [MOBILE_SHOP_KIT_KEY] : [];
}

export function licensedKitKeysForNav(input: {
  orgLicensed: boolean;
  memberKitKeys?: string[] | null;
}) {
  return canOpenMobileShop(input) ? [MOBILE_SHOP_KIT_KEY] : [];
}
