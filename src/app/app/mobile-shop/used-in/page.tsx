import { UsedPhoneForm } from "@/components/saas/mobile-shop-stock-forms";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listPhoneCatalog } from "@/lib/mobile-shop/store";

export default async function MobileShopUsedInPage() {
  const user = await requireMobileShopPage();
  const catalog = await listPhoneCatalog(user.organizationId);
  return (
    <section>
      <h1>Used phone</h1>
      <p className="ms-shop-lead">पुराना फोन. Family → model → color, then IMEI.</p>
      <UsedPhoneForm catalog={catalog} />
    </section>
  );
}
