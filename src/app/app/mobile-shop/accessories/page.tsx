import { AccessoriesFloor } from "@/components/saas/mobile-shop-accessories";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listMobileShopItems } from "@/lib/mobile-shop/store";

export default async function MobileShopAccessoriesPage() {
  const user = await requireMobileShopPage();
  const accessories = await listMobileShopItems(user.organizationId, "ACCESSORY");

  return (
    <section>
      <h1>Accessories</h1>
      <p className="ms-shop-lead">
        एक्सेसरी. Big taps, qty, search. Add if it is not listed. Sell is the
        stock out.
      </p>
      <AccessoriesFloor
        items={accessories.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          moq: item.moq,
        }))}
      />
    </section>
  );
}
