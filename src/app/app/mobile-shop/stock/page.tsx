import Link from "next/link";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listStockDashboard } from "@/lib/mobile-shop/store";
import { StockBoard } from "@/components/saas/mobile-shop-stock-board";

export default async function MobileShopStockPage() {
  const user = await requireMobileShopPage();
  const stock = await listStockDashboard(user.organizationId);

  return (
    <section>
      <h1>Stock</h1>
      <p className="ms-shop-lead">
        स्टॉक. Phones by IMEI, accessories by qty, below MOQ on top — not a
        spreadsheet dump.{" "}
        <Link href="/app/mobile-shop/stock-in">Stock in</Link>
      </p>
      <div className="ms-shop-kpis">
        <div className="ms-shop-kpi">
          <span>Phones in</span>
          <strong>{String(stock.phoneCount)}</strong>
          <small>by IMEI</small>
        </div>
        <div className="ms-shop-kpi">
          <span>Accessories</span>
          <strong>{String(stock.accessoryCount)}</strong>
          <small>with qty</small>
        </div>
        <div className="ms-shop-kpi">
          <span>Below MOQ</span>
          <strong>{String(stock.belowMoq.length)}</strong>
          <small>reorder</small>
        </div>
      </div>
      <StockBoard
        phones={stock.phones}
        accessories={stock.accessories}
        belowMoq={stock.belowMoq}
      />
    </section>
  );
}
