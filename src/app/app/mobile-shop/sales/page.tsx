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
      <h1>{used ? "Used sale" : "New sale"}</h1>
      <p className="ms-shop-lead">
        {used ? "पुराना फोन सेल." : "नया सेल."} Pick the phone — IMEI fills from
        unsold stock. Sale posts the out.
      </p>
      <SalePhoneForm phones={phones} used={used} presetImei={imei} />
    </section>
  );
}
