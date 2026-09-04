import { ShopForm } from "@/components/saas/mobile-shop-form";
import { sellAction, stockInAction, stockOutAction } from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listMobileShopItems } from "@/lib/mobile-shop/store";

export default async function MobileShopAccessoriesPage() {
  const user = await requireMobileShopPage();
  const accessories = await listMobileShopItems(user.organizationId, "ACCESSORY");
  const onHand = accessories.filter((item) => item.qty > 0);

  return (
    <section>
      <h1>Accessories</h1>
      <p className="ms-shop-lead">
        एक्सेसरी. Covers, chargers, earphones — qty, not grocery SKU chaos. Sell
        first. Stock in and stock out sit on this page.
      </p>

      {onHand.length === 0 ? (
        <p className="ms-shop-empty">
          No accessory qty on hand — tap Add stock below.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {onHand.map((item) => (
            <div className="ms-shop-card" key={item.id}>
              <div className="ms-shop-card-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>Qty {item.qty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ms-shop-panel">
        <h2>Sell</h2>
        <ShopForm action={sellAction} submitLabel="Sell accessory">
          <input name="mode" type="hidden" value="ACCESSORY" />
          <label>
            Item
            <select name="itemId" required defaultValue={onHand[0]?.id ?? ""}>
              {onHand.length === 0 ? (
                <option value="" disabled>
                  Add stock first
                </option>
              ) : (
                onHand.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · qty {item.qty}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Qty
            <input name="qty" type="number" min={1} defaultValue={1} inputMode="numeric" />
          </label>
          <label>
            Amount (₹)
            <input name="amount" inputMode="decimal" placeholder="0" />
          </label>
        </ShopForm>
      </div>

      <div className="ms-shop-panel">
        <h2>Stock in</h2>
        <ShopForm action={stockInAction} submitLabel="Add stock">
          <input name="kind" type="hidden" value="ACCESSORY" />
          <label>
            Name
            <input name="name" required placeholder="Plain cover / 20W charger" />
          </label>
          <label>
            Qty
            <input name="qty" type="number" min={1} defaultValue={1} inputMode="numeric" />
          </label>
        </ShopForm>
      </div>

      <div className="ms-shop-panel">
        <h2>Stock out</h2>
        <ShopForm action={stockOutAction} submitLabel="Stock out">
          <input name="reason" type="hidden" value="RETURN_TO_SUPPLIER" />
          <label>
            Item
            <select name="itemId" required defaultValue={onHand[0]?.id ?? ""}>
              {onHand.length === 0 ? (
                <option value="" disabled>
                  Nothing in stock
                </option>
              ) : (
                onHand.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · qty {item.qty}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Qty
            <input name="qty" type="number" min={1} defaultValue={1} inputMode="numeric" />
          </label>
        </ShopForm>
      </div>
    </section>
  );
}
