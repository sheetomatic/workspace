import { ShopForm } from "@/components/saas/mobile-shop-form";
import { stockInAction } from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";

export default async function MobileShopUsedInPage() {
  await requireMobileShopPage();
  return (
    <section>
      <h1>Used phone</h1>
      <p className="ms-shop-lead">पुराना फोन. Brand, model, IMEI — then it is in stock.</p>
      <ShopForm action={stockInAction} submitLabel="Add used phone">
        <input name="kind" type="hidden" value="PHONE" />
        <input name="condition" type="hidden" value="USED" />
        <input name="reason" type="hidden" value="PURCHASE" />
          <label>
            Brand
            <input name="brand" required placeholder="Samsung / Redmi" autoComplete="off" />
          </label>
          <label>
            Model
            <input name="model" required placeholder="A15 / Note 13" autoComplete="off" />
          </label>
          <label>
            Color · रंग
            <input name="color" placeholder="Black" autoComplete="off" />
          </label>
          <label>
            IMEI / serial
            <input name="imei" required inputMode="numeric" autoComplete="off" placeholder="15 digits" />
          </label>
      </ShopForm>
    </section>
  );
}
