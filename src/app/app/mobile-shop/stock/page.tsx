import { requireSession } from "@/lib/require-session";
import { redirect } from "next/navigation";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { listMobileShopItems } from "@/lib/mobile-shop/store";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { stockInAction, stockOutAction } from "@/app/app/mobile-shop/actions";

export default async function MobileShopStockPage() {
  const user = await requireSession();
  if (!(await orgHasActiveKitLicense(user.organizationId, MOBILE_SHOP_KIT_KEY))) {
    redirect("/app/mobile-shop");
  }
  const items = await listMobileShopItems(user.organizationId);
  const inStock = items.filter((item) => item.qty > 0);

  return (
    <section>
      <h1>Stock in / stock out</h1>
      <p>Phones move by IMEI. Accessories and repair parts move by qty.</p>

      <h2>Stock in</h2>
      <ShopForm action={stockInAction}>
        <label>
          Kind
          <select name="kind" defaultValue="PHONE">
            <option value="PHONE">Phone (IMEI)</option>
            <option value="ACCESSORY">Accessory (qty)</option>
            <option value="PART">Repair part (qty)</option>
          </select>
        </label>
        <label>
          Brand
          <input name="brand" placeholder="Samsung" />
        </label>
        <label>
          Model
          <input name="model" placeholder="A15" />
        </label>
        <label>
          IMEI
          <input name="imei" placeholder="Required for phones" />
        </label>
        <label>
          Condition
          <select name="condition" defaultValue="NEW">
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>
        </label>
        <label>
          Name (accessory / part)
          <input name="name" placeholder="Plain cover / A15 screen" />
        </label>
        <label>
          Qty
          <input name="qty" type="number" min={1} defaultValue={1} />
        </label>
        <label>
          Notes
          <input name="notes" />
        </label>
      </ShopForm>

      <h2>Stock out</h2>
      <ShopForm action={stockOutAction}>
        <label>
          Item
          <select name="itemId" required>
            {inStock.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kind} · {item.name}
                {item.imei ? ` · ${item.imei}` : ""} · qty {item.qty}
              </option>
            ))}
          </select>
        </label>
        <label>
          Qty
          <input name="qty" type="number" min={1} defaultValue={1} />
        </label>
        <label>
          Notes
          <input name="notes" />
        </label>
      </ShopForm>
    </section>
  );
}
