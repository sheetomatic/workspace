import Link from "next/link";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { listPhoneCatalog, listRecentInbounds } from "@/lib/mobile-shop/store";
import { formatPromisedAt } from "@/lib/mobile-shop/promised-at";
import { StockInForm } from "@/components/saas/mobile-shop-stock-forms";

export default async function MobileShopStockInPage() {
  const user = await requireMobileShopPage();
  const [catalog, invoices] = await Promise.all([
    listPhoneCatalog(user.organizationId),
    listRecentInbounds(user.organizationId, 12),
  ]);

  return (
    <section>
      <h1>Stock in</h1>
      <p className="ms-shop-lead">
        स्टॉक इन. Invoice header, then every phone / accessory on that bill.
        Select a phone — make, model, color fill. Type IMEI or qty.
      </p>
      <StockInForm catalog={catalog} />
      <p>
        <Link href="/app/mobile-shop/stock">See stock</Link>
        {" · "}
        <Link href="/app/mobile-shop/used-in">Used phone in</Link>
      </p>
      <h2>Recent invoices</h2>
      {invoices.length === 0 ? (
        <p className="ms-shop-empty">
          Nothing in yet — add an invoice above.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {invoices.map((invoice) => (
            <div className="ms-shop-card" key={invoice.id}>
              <strong>
                {invoice.invoiceNo}
                {invoice.supplier ? ` · ${invoice.supplier}` : ""}
              </strong>
              <span>
                {invoice.invoiceDate ? formatPromisedAt(invoice.invoiceDate) : "No date"}
                {" · "}
                {invoice.lines.length} line{invoice.lines.length === 1 ? "" : "s"}
              </span>
              <ul className="ms-shop-invoice-lines">
                {invoice.lines.map((line) => (
                  <li key={line.id}>
                    {line.item.name}
                    {line.item.imei ? ` · ${line.item.imei}` : ` · qty ${line.qty}`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
