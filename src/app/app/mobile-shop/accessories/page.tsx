import { ShopForm } from "@/components/saas/mobile-shop-form";
import { sellAction, stockInAction } from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listMobileShopItems } from "@/lib/mobile-shop/store";

export default async function MobileShopAccessoriesPage() {
  const user = await requireMobileShopPage();
  const accessories = await listMobileShopItems(user.organizationId, "ACCESSORY");
  const onHand = accessories.filter((item) => item.qty > 0);

  return (
    <section>
      <h1>Accessory sale</h1>
      <p className="ms-shop-lead">एक्सेसरी सेल. Cover, charger, earphones, glass — qty, not grocery.</p>

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

      <details>
        <summary>Add accessory stock</summary>
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
      </details>
    </section>
  );
}
