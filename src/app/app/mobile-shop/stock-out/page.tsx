import Link from "next/link";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";

export default async function MobileShopStockOutPage() {
  await requireMobileShopPage();
  return (
    <section>
      <h1>Stock out</h1>
      <p className="ms-shop-lead">
        Sale is the stock out. No separate Out tap. New / used / accessory sale
        and repair parts used post the out.
      </p>
      <div className="ms-shop-actions">
        <Link className="ms-shop-btn" href="/app/mobile-shop/sales">
          New sale
          <small>नया सेल</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/sales?type=used">
          Used sale
          <small>पुराना सेल</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/accessories">
          Accessories
          <small>एक्सेसरी</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/repairs">
          Repair
          <small>रिपेयर</small>
        </Link>
      </div>
    </section>
  );
}
