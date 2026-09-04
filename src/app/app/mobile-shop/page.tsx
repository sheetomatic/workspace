import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { mobileShopDashboard } from "@/lib/mobile-shop/store";

export default async function MobileShopHomePage() {
  const user = await requireSession();
  const licensed = await orgHasActiveKitLicense(
    user.organizationId,
    MOBILE_SHOP_KIT_KEY,
  );
  if (!licensed) {
    return (
      <section>
        <h1>Mobile shop</h1>
        <p>
          This workspace does not have an active Mobile Shop license. Request it
          under Licensed kits, pay the invoice, then this counter opens.
        </p>
        <Link className="btn-primary btn-sm" href="/app/fms/kits">
          Licensed kits
        </Link>
      </section>
    );
  }

  const stats = await mobileShopDashboard(user.organizationId);
  return (
    <section>
      <h1>Today</h1>
      <p>Numbers for this shop. Big buttons for the counter.</p>
      <div className="ms-shop-kpis">
        <div className="ms-shop-kpi">
          <span>Phones in stock</span>
          <strong>{stats.phonesInStock}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Stock in today</span>
          <strong>{stats.stockInToday}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Sold / out today</span>
          <strong>{stats.soldToday}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Repairs open</span>
          <strong>{stats.repairsOpen}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Ready for pickup</span>
          <strong>{stats.repairsReady}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Accessories sold qty</span>
          <strong>{stats.accessorySoldQty}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Accessory lines in stock</span>
          <strong>{stats.accessoryLines}</strong>
        </div>
      </div>
      <div className="ms-shop-actions">
        <Link className="ms-shop-btn" href="/app/mobile-shop/stock">
          Stock in / stock out
          <small>IMEI for phones, qty for accessories</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/repairs">
          Repairs
          <small>Received → in progress → ready → delivered</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/accessories">
          Accessories
          <small>Sell + stock</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/sales?type=new">
          New sale
          <small>New phone IMEI out</small>
        </Link>
        <Link className="ms-shop-btn" href="/app/mobile-shop/sales?type=used">
          Used phone sale
          <small>Used / refurbished IMEI out</small>
        </Link>
      </div>
    </section>
  );
}
