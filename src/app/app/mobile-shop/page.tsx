import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { getMobileShopAccess } from "@/lib/mobile-shop/access";
import { formatInrPaise } from "@/lib/billing/money";
import { formatIndianGreetingDate } from "@/lib/format-datetime";
import { MOBILE_SHOP_HOME_ACTIONS } from "@/lib/mobile-shop/home-actions";
import { formatPromisedAt } from "@/lib/mobile-shop/promised-at";
import { summarizeShopDay, type MoneyCount } from "@/lib/mobile-shop/day-glance";
import { mobileShopDashboard } from "@/lib/mobile-shop/store";

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="ms-shop-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function rupees(row: MoneyCount) {
  return formatInrPaise(row.paise);
}

function emptyGlance() {
  return summarizeShopDay({
    now: new Date(),
    movements: [],
    repairs: [],
    stockItems: [],
  });
}

export default async function MobileShopHomePage() {
  const user = await requireSession();
  const access = await getMobileShopAccess(user);
  if (!access.allowed) {
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

  let stats = emptyGlance();
  try {
    stats = await mobileShopDashboard(user.organizationId);
  } catch (error) {
    console.error("[mobile-shop] day glance failed", error);
  }
  const { sales, stockIn, stockOut, repairs, lowStock, overdueRepairs } = stats;
  const hasExceptions = lowStock.length > 0 || overdueRepairs.length > 0;
  const noSales = sales.total.count === 0;

  return (
    <section>
      <h1>Today</h1>
      <p className="ms-shop-lead">
        {formatIndianGreetingDate(new Date())}
      </p>

      <div className="ms-shop-glance">
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
            hint={rupees(sales.newPhones)}
          />
          <Tile
            label="Used phones"
            value={String(sales.usedPhones.count)}
            hint={rupees(sales.usedPhones)}
          />
          <Tile
            label="Accessories"
            value={String(sales.accessories.qty)}
            hint={rupees(sales.accessories)}
          />
          <Tile
            label="Stock in"
            value={String(stockIn.count)}
            hint={`qty ${stockIn.qty}`}
          />
          <Tile
            label="Stock out"
            value={String(stockOut.count)}
            hint={`qty ${stockOut.qty}`}
          />
          <Tile
            label="Repairs"
            value={`${repairs.open} open`}
            hint={`${repairs.ready} ready`}
          />
        </div>

        {noSales ? (
          <p className="ms-shop-empty">
            No sales yet — tap{" "}
            <Link href="/app/mobile-shop/sales">New sale</Link>
          </p>
        ) : null}
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
