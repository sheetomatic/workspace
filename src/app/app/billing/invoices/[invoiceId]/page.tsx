import { notFound } from "next/navigation";
import { loadInvoiceForViewer } from "@/app/app/billing/actions";
import { InvoicePrintButton } from "@/components/saas/invoice-print-button";
import "@/components/saas/client-billing.css";
import { formatBillingDate } from "@/lib/billing/dates";
import { invoiceLineItems } from "@/lib/billing/invoices";
import { formatInrPaise } from "@/lib/billing/money";
import { SHEETOMATIC_QUOTATION_ACCOUNT } from "@/lib/leads/seller-account";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const invoice = await loadInvoiceForViewer(invoiceId);
  if (!invoice) notFound();

  const lines = invoiceLineItems(invoice.lineItems);
  const account = SHEETOMATIC_QUOTATION_ACCOUNT;
  const billTo =
    invoice.organization.billing?.billingName ?? invoice.organization.name;

  return (
    <div className="saas-page">
      <div className="ws-invoice-print">
        <InvoicePrintButton />
        <header>
          <div>
            <h1>Tax invoice</h1>
            <div>{account.legalName}</div>
            {account.addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div>PAN {account.pan}</div>
            <div>Udyam {account.udyamNumber}</div>
          </div>
          <div>
            <strong>{invoice.number}</strong>
            <div>Status: {invoice.status}</div>
            <div>Issued {formatBillingDate(invoice.issuedAt)}</div>
            <div>Due {formatBillingDate(invoice.dueAt)}</div>
          </div>
        </header>
        <p>
          Bill to: <strong>{billTo}</strong>
          {invoice.organization.billing?.gstin
            ? ` · GSTIN ${invoice.organization.billing.gstin}`
            : ""}
        </p>
        <p>
          Period {formatBillingDate(invoice.periodStart)} –{" "}
          {formatBillingDate(invoice.periodEnd)}
        </p>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.label}-${index}`}>
                <td>{line.label}</td>
                <td className="num">{line.quantity}</td>
                <td className="num">{formatInrPaise(line.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ws-invoice-totals">
          <table>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td className="num">{formatInrPaise(invoice.subtotalPaise)}</td>
              </tr>
              <tr>
                <td>Extra charges</td>
                <td className="num">{formatInrPaise(invoice.extraPaise)}</td>
              </tr>
              <tr>
                <td>GST</td>
                <td className="num">{formatInrPaise(invoice.gstPaise)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <strong>{formatInrPaise(invoice.totalPaise)}</strong>
                </td>
              </tr>
              <tr>
                <td>Paid</td>
                <td className="num">{formatInrPaise(invoice.paidPaise)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="ws-invoice-pay">
          <strong>Pay</strong>
          <div>UPI {account.upiId}</div>
          <div>
            {account.bankName} · {account.accountType} · {account.accountNumber} /{" "}
            {account.ifsc}
          </div>
          <div>Account holder {account.accountHolder}</div>
          <p>
            If this invoice is not paid by the due date, the workspace stops the
            next day until payment is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
}
