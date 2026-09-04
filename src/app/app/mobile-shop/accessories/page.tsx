import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { listMobileShopItems } from "@/lib/mobile-shop/store";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { sellAction, stockInAction } from "@/app/app/mobile-shop/actions";

export default async function MobileShopAccessoriesPage() {
  const user = await requireSession();
  if (!(await orgHasActiveKitLicense(user.organizationId, MOBILE_SHOP_KIT_KEY))) {
    redirect("/app/mobile-shop");
  }
  const accessories = await listMobileShopItems(user.organizationId, "ACCESSORY");

  return (
    <section>
      <h1>Accessories</h1>
      <p>Covers, chargers, earphones, glass — qty, not grocery SKUs.</p>

      <h2>Stock in</h2>
      <ShopForm action={stockInAction} submitLabel="Add stock">
        <input name="kind" type="hidden" value="ACCESSORY" />
        <label>
          Name
          <input name="name" required placeholder="Plain cover / 20W charger" />
        </label>
        <label>
          Qty
          <input name="qty" type="number" min={1} defaultValue={1} />
        </label>
      </ShopForm>

      <h2>Sell</h2>
      <ShopForm action={sellAction} submitLabel="Sell">
        <input name="mode" type="hidden" value="ACCESSORY" />
        <label>
          Item
          <select name="itemId" required>
            {accessories
              .filter((item) => item.qty > 0)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · qty {item.qty}
                </option>
              ))}
          </select>
        </label>
        <label>
          Qty
          <input name="qty" type="number" min={1} defaultValue={1} />
        </label>
        <label>
          Customer
          <input name="customerName" />
        </label>
        <label>
          Phone
          <input name="customerPhone" />
        </label>
        <label>
          Amount (₹)
          <input name="amount" />
        </label>
      </ShopForm>

      <h2>On hand</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {accessories.length === 0 ? (
            <tr>
              <td colSpan={2}>No accessory SKUs yet.</td>
            </tr>
          ) : (
            accessories.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.qty}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
