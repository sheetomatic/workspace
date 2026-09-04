import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { formatInrPaise } from "@/lib/billing/money";
import { formatIndianGreetingDate } from "@/lib/format-datetime";
import { MOBILE_SHOP_HOME_ACTIONS } from "@/lib/mobile-shop/home-actions";
import { formatPromisedAt } from "@/lib/mobile-shop/promised-at";
import { mobileShopDashboard } from "@/lib/mobile-shop/store";
import type { MoneyCount } from "@/lib/mobile-shop/day-glance";

function Tile({
  label,
  value,
  hint,
  wide,
}: {
  label: string;
  value: string;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "ms-shop-kpi ms-shop-kpi--wide" : "ms-shop-kpi"}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function moneyHint(row: MoneyCount) {
  if (row.count === 0) return "—";
  return formatInrPaise(row.paise);
}

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
  const { sales, stockIn, stockOut, repairs, lowStock, overdueRepairs } = stats;
  const hasExceptions = lowStock.length > 0 || overdueRepairs.length > 0;

  return (
    <section>
      <h1>Today</h1>
      <p className="ms-shop-lead">
        {formatIndianGreetingDate(new Date())} · आज की नज़र. Money and counts —
        not a spreadsheet.
      </p>

      <div className="ms-shop-hero">
        <span>Sales today</span>
        <strong>{formatInrPaise(sales.total.paise)}</strong>
        <small>
          {sales.newPhones.count} new · {sales.usedPhones.count} used ·{" "}
          {sales.accessories.qty} accessories
        </small>
      </div>

      <div className="ms-shop-kpis">
        <Tile
          label="New phones"
          value={String(sales.newPhones.count)}
          hint={moneyHint(sales.newPhones)}
        />
        <Tile
          label="Used phones"
          value={String(sales.usedPhones.count)}
          hint={moneyHint(sales.usedPhones)}
        />
        <Tile
          label="Accessories sold"
          value={String(sales.accessories.qty)}
          hint={moneyHint(sales.accessories)}
        />
        <Tile
          label="Stock in / out"
          value={`${stockIn.count} / ${stockOut.count}`}
          hint={`qty ${stockIn.qty} in · ${stockOut.qty} out`}
        />
        <Tile
          wide
          label="Repairs today"
          value={`${repairs.received} received · ${repairs.delivered} delivered`}
          hint={`${repairs.inProgress} in progress · ${repairs.ready} ready`}
        />
      </div>

      {hasExceptions ? (
        <div className="ms-shop-exceptions">
          <h2>Needs a look</h2>
          {overdueRepairs.map((job) => (
            <Link
              className="ms-shop-card"
              href={`/app/mobile-shop/repairs/${job.id}`}
              key={job.id}
            >
              <div className="ms-shop-card-row">
                <div>
                  <strong>{job.customerName}</strong>
                  <span>
                    {job.deviceName} · promised {formatPromisedAt(job.promisedAt)}
                  </span>
                </div>
                <span className="ms-shop-chip ms-shop-chip--warn">Overdue</span>
              </div>
            </Link>
          ))}
          {lowStock.map((item) => (
            <Link
              className="ms-shop-card"
              href={
                item.kind === "ACCESSORY"
                  ? "/app/mobile-shop/accessories"
                  : "/app/mobile-shop/stock-in"
              }
              key={item.id}
            >
              <div className="ms-shop-card-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.kind === "PART" ? "Part" : "Accessory"}</span>
                </div>
                <span className="ms-shop-chip ms-shop-chip--warn">
                  Qty {item.qty}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <h2>Do now</h2>
      <div className="ms-shop-actions">
        {MOBILE_SHOP_HOME_ACTIONS.map((action) => (
          <Link className="ms-shop-btn" href={action.href} key={action.href}>
            {action.label}
            <small>{action.hi}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
