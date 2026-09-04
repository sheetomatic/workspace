import { requireSession } from "@/lib/require-session";
import { MobileShopNav } from "@/components/saas/mobile-shop-nav";
import "@/components/saas/mobile-shop.css";

export default async function MobileShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return (
    <div className="saas-page ms-shop">
      <MobileShopNav />
      {children}
    </div>
  );
}
