import "server-only";

import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { requireSession } from "@/lib/require-session";
import { canPreviewMobileShopWithoutLicense } from "@/lib/mobile-shop/preview-bypass";

export { canPreviewMobileShopWithoutLicense };

export async function getMobileShopAccess(user: SessionUser) {
  const licensed = await orgHasActiveKitLicense(
    user.organizationId,
    MOBILE_SHOP_KIT_KEY,
  );
  const previewBypass =
    !licensed &&
    canPreviewMobileShopWithoutLicense(user.role, user.isSuperAdmin);
  return {
    licensed,
    previewBypass,
    allowed: licensed || previewBypass,
  };
}

export async function requireMobileShopPage() {
  const user = await requireSession();
  const access = await getMobileShopAccess(user);
  if (!access.allowed) {
    redirect("/app/mobile-shop");
  }
  return user;
}
