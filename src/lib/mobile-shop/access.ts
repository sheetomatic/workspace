import "server-only";

import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { canOpenMobileShop } from "@/lib/mobile-shop/kit-access";
import { requireSession } from "@/lib/require-session";

export async function getMobileShopAccess(user: SessionUser) {
  const [licensed, membership] = await Promise.all([
    orgHasActiveKitLicense(user.organizationId, MOBILE_SHOP_KIT_KEY),
    prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
      select: { enabledKitKeys: true },
    }),
  ]);
  return {
    licensed,
    previewBypass: false,
    allowed: canOpenMobileShop({
      orgLicensed: licensed,
      memberKitKeys: membership?.enabledKitKeys,
    }),
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
