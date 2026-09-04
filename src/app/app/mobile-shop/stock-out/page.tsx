import Link from "next/link";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listMobileShopItems, listRecentMovements } from "@/lib/mobile-shop/store";
import { reasonLabel, STOCK_OUT_SALE_LINKS } from "@/lib/mobile-shop/reasons";
import { StockOutForm } from "@/components/saas/mobile-shop-stock-forms";

export default async function MobileShopStockOutPage() {
  const user = await requireMobileShopPage();
  const [items, recent] = await Promise.all([
    listMobileShopItems(user.organizationId),
    listRecentMovements(user.organizationId, 12, "out"),
  ]);
  const inStock = items.filter((item) => item.qty > 0);
  const outs = recent;

  return (
    <section>
      <h1>Stock out</h1>
      <p className="ms-shop-lead">
        स्टॉक आउट. Sale, used sale, accessory sale, repair part, or return to
        supplier.
      </p>
      <div className="ms-shop-actions">
        {STOCK_OUT_SALE_LINKS.map((link) => (
          <Link className="ms-shop-btn" href={link.href} key={link.href}>
            {link.label}
            <small>{link.hi}</small>
          </Link>
        ))}
      </div>
      <h2>Part used / supplier return</h2>
      <StockOutForm
        items={inStock.map((item) => ({
          id: item.id,
          kind: item.kind,
          name: item.name,
          imei: item.imei,
          qty: item.qty,
        }))}
      />
      <p>
        <Link href="/app/mobile-shop/stock">See stock</Link>
      </p>
      <h2>Recent out</h2>
      {outs.length === 0 ? (
        <p className="ms-shop-empty">
          Nothing out yet — tap{" "}
          <Link href="/app/mobile-shop/sales">New sale</Link>,{" "}
          <Link href="/app/mobile-shop/sales?type=used">Used</Link>, or{" "}
          <Link href="/app/mobile-shop/accessories">Accessories</Link>.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {outs.map((row) => (
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
