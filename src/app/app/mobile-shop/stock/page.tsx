import Link from "next/link";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { stockInAction } from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listMobileShopItems } from "@/lib/mobile-shop/store";

export default async function MobileShopStockPage() {
  const user = await requireMobileShopPage();
  const items = await listMobileShopItems(user.organizationId);
  const phones = items.filter((item) => item.kind === "PHONE" && item.qty > 0);
  const accessories = items.filter((item) => item.kind === "ACCESSORY" && item.qty > 0);

  return (
    <section>
      <h1>Stock check</h1>
      <p className="ms-shop-lead">
        What is in the shop. Tap a phone to sell.{" "}
        <Link href="/app/mobile-shop/stock-in">Stock in</Link>
        {" · "}
        <Link href="/app/mobile-shop/stock-out">Stock out</Link>
      </p>

      <h2>Phones</h2>
      {phones.length === 0 ? (
        <p className="ms-shop-empty">
          No phones in stock — tap{" "}
          <Link href="/app/mobile-shop/stock-in">Stock in</Link>.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {phones.map((item) => {
            const used = item.condition !== "NEW";
            const href = used
              ? `/app/mobile-shop/sales?type=used&imei=${encodeURIComponent(item.imei ?? "")}`
              : `/app/mobile-shop/sales?imei=${encodeURIComponent(item.imei ?? "")}`;
            return (
              <Link className="ms-shop-card" href={href} key={item.id}>
                <div className="ms-shop-card-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.imei ?? "No IMEI"} · {used ? "Used" : "New"}
                    </span>
                  </div>
                  <span className="ms-shop-chip">Sell</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <h2>Accessories</h2>
      {accessories.length === 0 ? (
        <p className="ms-shop-empty">
          No accessory qty on hand — tap{" "}
          <Link href="/app/mobile-shop/accessories">Accessories</Link>.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {accessories.map((item) => (
            <Link className="ms-shop-card" href="/app/mobile-shop/accessories" key={item.id}>
              <div className="ms-shop-card-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>Qty {item.qty}</span>
                </div>
                <span className="ms-shop-chip">Sell</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <details>
        <summary>Add a new phone to stock</summary>
        <ShopForm action={stockInAction} submitLabel="Add new phone">
          <input name="kind" type="hidden" value="PHONE" />
          <input name="condition" type="hidden" value="NEW" />
          <label>
            Brand
            <input name="brand" required placeholder="Samsung" />
          </label>
          <label>
            Model
            <input name="model" required placeholder="A15" />
          </label>
          <label>
            IMEI / serial
            <input name="imei" required inputMode="numeric" />
          </label>
        </ShopForm>
      </details>
    </section>
  );
}
