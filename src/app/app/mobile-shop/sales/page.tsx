import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { sellAction } from "@/app/app/mobile-shop/actions";

export default async function MobileShopSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireSession();
  if (!(await orgHasActiveKitLicense(user.organizationId, MOBILE_SHOP_KIT_KEY))) {
    redirect("/app/mobile-shop");
  }
  const { type } = await searchParams;
  const used = type === "used";

  return (
    <section>
      <h1>{used ? "Used phone sale" : "New sale"}</h1>
      <p>
        {used
          ? "Stock-out a used or refurbished IMEI."
          : "Stock-out a new phone IMEI."}{" "}
        <Link href={used ? "/app/mobile-shop/sales?type=new" : "/app/mobile-shop/sales?type=used"}>
          {used ? "Switch to new sale" : "Switch to used sale"}
        </Link>
      </p>
      <ShopForm action={sellAction} submitLabel="Record sale">
        <input name="mode" type="hidden" value="PHONE" />
        <input name="saleType" type="hidden" value={used ? "USED" : "NEW"} />
        <label>
          IMEI
          <input name="imei" required />
        </label>
        <label>
          Customer
          <input name="customerName" required />
        </label>
        <label>
          Phone
          <input name="customerPhone" required />
        </label>
        <label>
          Amount (₹)
          <input name="amount" required />
        </label>
      </ShopForm>
    </section>
  );
}
