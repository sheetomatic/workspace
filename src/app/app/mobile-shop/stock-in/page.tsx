import Link from "next/link";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listRecentMovements } from "@/lib/mobile-shop/store";
import { reasonLabel } from "@/lib/mobile-shop/reasons";
import { StockInForm } from "@/components/saas/mobile-shop-stock-forms";

export default async function MobileShopStockInPage() {
  const user = await requireMobileShopPage();
  const recent = await listRecentMovements(user.organizationId, 12, "in");

  return (
    <section>
      <h1>Stock in</h1>
      <p className="ms-shop-lead">
        स्टॉक इन. New phone, used phone, accessory, or part. Purchase, return, or
        transfer in. IMEI for phones, qty for the rest.
      </p>
      <StockInForm />
      <p>
        <Link href="/app/mobile-shop/stock">See stock</Link>
        {" · "}
        <Link href="/app/mobile-shop/used-in">Used phone in</Link>
      </p>
      <h2>Today’s in</h2>
      {recent.length === 0 ? (
        <p className="ms-shop-empty">
          Nothing in yet — add a phone or accessory above.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {recent.map((row) => (
            <div className="ms-shop-card" key={row.id}>
              <strong>{row.item.name}</strong>
              <span>
                {reasonLabel(row.reason)} · qty {row.qty}
                {row.item.imei ? ` · ${row.item.imei}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
