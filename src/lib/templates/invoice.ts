import { inr } from "./commerce";
import type { CheckoutSnapshot } from "./checkout";
import { placeOfSupplyLabel } from "@/lib/leads/gst-invoice";

const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function templateInvoiceHtml(order: {
  snapshot: unknown;
  paidAt: Date | null;
  invoiceNumber: string | null;
  gatewayPaymentId: string | null;
}) {
  if (!order.paidAt || !order.invoiceNumber)
    throw new Error("A tax invoice is available only after verified payment.");
  const s = order.snapshot as CheckoutSnapshot;
  const isTasks = s.kind === "tasks";
  const t = s.totals;
  const taxRows = t.igstPaise
    ? `<tr><th>IGST (18%)</th><td>${inr(t.igstPaise)}</td></tr>`
    : `<tr><th>CGST (9%)</th><td>${inr(t.cgstPaise)}</td></tr><tr><th>SGST (9%)</th><td>${inr(t.sgstPaise)}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tax invoice ${esc(order.invoiceNumber)}</title><style>body{font:15px/1.6 Arial,sans-serif;color:#182438;max-width:900px;margin:40px auto;padding:20px}h1{margin-bottom:0}section{margin:24px 0}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left}small{color:#475569}.totals{max-width:400px;margin-left:auto} @media print{body{margin:0;padding:0}}</style></head><body>
  <h1>Tax Invoice</h1><p>${esc(order.invoiceNumber)} · ${esc(order.paidAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }))} · PAID</p>
  <section><strong>${esc(s.seller.tradeName)}</strong><br>${esc(s.seller.legalName)}<br>${s.seller.addressLines.map(esc).join("<br>")}<br>GSTIN: ${esc(s.seller.gstin)}</section>
  <section><strong>Bill to: ${esc(s.buyer.billedTo)}</strong><br>${esc(s.buyer.address)}<br>${esc(s.buyer.city)} · ${esc(placeOfSupplyLabel(s.buyer.stateCode))} · ${esc(s.buyer.pin)}<br>GSTIN: ${esc(s.buyer.gstin || "Unregistered")}</section>
  <p>Place of supply: ${esc(placeOfSupplyLabel(s.buyer.stateCode))} · Reverse charge: No</p>
  <table><thead><tr><th>Description</th><th>SAC</th><th>Qty</th><th>Taxable value</th><th>GST</th><th>Total</th></tr></thead><tbody>${s.lines.map((l, i) => `<tr><td>${esc(l.name)}<br><small>${isTasks ? "Fixed service term; manual renewal; no automatic recurring charge" : "Standard template licence; no customisation"}</small></td><td>${esc(l.sac)}</td><td>${l.quantity ?? 1}</td><td>${inr(l.priceInr * 100)}</td><td>18% · ${inr(Math.round(t.lines[i].gstAmount * 100))}</td><td>${inr(Math.round(t.lines[i].totalAmount * 100))}</td></tr>`).join("")}</tbody></table>
  <table class="totals"><tr><th>Subtotal</th><td>${inr(t.subtotalPaise)}</td></tr>${taxRows}<tr><th>Total paid</th><td>${inr(t.totalPaise)}</td></tr></table>
  <p>Payment reference: ${esc(order.gatewayPaymentId)}</p><p>${isTasks ? "Access activation follows verified payment and account setup. WhatsApp provider usage charges, if applicable, are separate." : "Copy licence for your own business use. Customisation and third-party subscriptions are excluded."}</p><p>For ${esc(s.seller.tradeName)}<br>Computer-generated invoice.</p><small>Use your browser’s Print → Save as PDF to save this invoice.</small></body></html>`;
}
