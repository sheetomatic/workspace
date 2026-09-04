import Link from "next/link";
import { SalePhoneForm } from "@/components/saas/mobile-shop-sale-form";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listUnsoldPhones } from "@/lib/mobile-shop/store";

export default async function MobileShopSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; imei?: string }>;
}) {
  const user = await requireMobileShopPage();
  const { type, imei } = await searchParams;
  const used = type === "used";
  const phones = await listUnsoldPhones(user.organizationId, used ? "USED" : "NEW");

  return (
    <section>
      <h1>Sale</h1>
      <p className="ms-shop-lead">
        सेल. New or used — pick the phone, IMEI fills from unsold stock. Sale
        posts the out.
      </p>
      <div className="ms-shop-type" role="group" aria-label="Sale type">
        <Link className={used ? undefined : "is-active"} href="/app/mobile-shop/sales">
          New
          <small>नया</small>
        </Link>
        <Link
          className={used ? "is-active" : undefined}
          href="/app/mobile-shop/sales?type=used"
        >
          Used
          <small>पुराना</small>
        </Link>
      </div>
      <SalePhoneForm phones={phones} used={used} presetImei={imei} />
    </section>
  );
}
