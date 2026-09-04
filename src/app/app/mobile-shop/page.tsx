import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { MOBILE_SHOP_HOME_ACTIONS } from "@/lib/mobile-shop/home-actions";
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
        <p className="ms-shop-lead">
          License is not active. Request it, pay the invoice, then the counter
          opens.
        </p>
        <Link className="ms-shop-btn" href="/app/fms/kits">
          Licensed kits
          <small>Request / pay</small>
        </Link>
      </section>
    );
  }

  const stats = await mobileShopDashboard(user.organizationId);
  return (
    <section>
      <h1>Today</h1>
      <p className="ms-shop-lead">Tap what you are doing. आज क्या करना है?</p>
      <div className="ms-shop-kpis">
        <div className="ms-shop-kpi">
          <span>Phones in</span>
          <strong>{stats.phonesInStock}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Repairs open</span>
          <strong>{stats.repairsOpen}</strong>
        </div>
        <div className="ms-shop-kpi">
          <span>Ready</span>
          <strong>{stats.repairsReady}</strong>
        </div>
      </div>
      <div className="ms-shop-actions">
        {MOBILE_SHOP_HOME_ACTIONS.map((action, index) => (
          <Link
            className={
              index === MOBILE_SHOP_HOME_ACTIONS.length - 1
                ? "ms-shop-btn ms-shop-btn--wide"
                : "ms-shop-btn"
            }
            href={action.href}
            key={action.href}
          >
            {action.label}
            <small>{action.hi}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
