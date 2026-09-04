import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { getMobileShopAccess } from "@/lib/mobile-shop/access";
import { MobileShopNav } from "@/components/saas/mobile-shop-nav";
import "@/components/saas/mobile-shop.css";

export default async function MobileShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const access = await getMobileShopAccess(user);
  return (
    <div className="saas-page ms-shop">
      <MobileShopNav />
      {access.previewBypass ? (
        <p className="ms-shop-license-banner">
          Owner preview.
          {" "}
          <Link href="/app/fms/kits">Get license</Link>
        </p>
      ) : null}
      {children}
    </div>
  );
}
