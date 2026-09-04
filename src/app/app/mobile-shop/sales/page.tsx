import { ShopForm } from "@/components/saas/mobile-shop-form";
import { sellAction } from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";

export default async function MobileShopSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; imei?: string }>;
}) {
  await requireMobileShopPage();
  const { type, imei } = await searchParams;
  const used = type === "used";

  return (
    <section>
      <h1>{used ? "Used sale" : "New sale"}</h1>
      <p className="ms-shop-lead">
        {used ? "पुराना फोन सेल · IMEI out." : "नया सेल · IMEI out."} Customer
        takes the phone. Four fields.
      </p>
      <ShopForm action={sellAction} submitLabel={used ? "Sell used phone" : "Sell new phone"}>
        <input name="mode" type="hidden" value="PHONE" />
        <input name="saleType" type="hidden" value={used ? "USED" : "NEW"} />
        <label>
          IMEI / serial
          <input
            name="imei"
            required
            inputMode="numeric"
            autoComplete="off"
            defaultValue={imei ?? ""}
            placeholder="15 digits"
          />
        </label>
        <label>
          Customer
          <input name="customerName" required autoComplete="name" placeholder="Name" />
        </label>
        <label>
          WhatsApp / phone
          <input
            name="customerPhone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="98xxxxxxxx"
          />
        </label>
        <label>
          Amount (₹)
          <input name="amount" required inputMode="decimal" placeholder="0" />
        </label>
      </ShopForm>
    </section>
  );
}
