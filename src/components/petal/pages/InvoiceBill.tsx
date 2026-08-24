"use client";

import { useParams } from "next/navigation";
import { BrandLogo, QR_SRC } from "../BrandLogo";
import { customer, invoiceById, money } from "../data";
import { PetalLink } from "../nav";
import { useAgency } from "../ui";

function DailyGrid({ daily }: { daily: number[] }) {
  const a = daily.slice(0, 16);
  const b = daily.slice(16, 31);
  return (
    <div className="inv-daily">
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            {a.map((_, i) => <th key={i}>{String(i + 1).padStart(2, "0")}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>JAR</td>
            {a.map((n, i) => <td key={i}>{n}</td>)}
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            {b.map((_, i) => <th key={i}>{String(i + 17).padStart(2, "0")}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>JAR</td>
            {b.map((n, i) => <td key={i}>{n}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceBill() {
  const { id } = useParams();
  const a = useAgency();
  const inv = a.invoices.find((i) => i.id === id) || invoiceById(id || "");
  const c = inv ? customer(inv.customerId) : undefined;
  if (!inv || !c) {
    return <div style={{ padding: 24 }}>Invoice not found. <PetalLink to="/app">Back</PetalLink></div>;
  }
  return (
    <div className="inv-page">
      <div className="inv-toolbar pp-bar" style={{ maxWidth: 800, margin: "0 auto 12px" }}>
        <PetalLink to="/app" aria-label="Back" style={{ color: "#fff", fontSize: 28, lineHeight: 1, width: 36, textDecoration: "none" }}>‹</PetalLink>
        <h1 style={{ flex: 1, fontSize: 18 }}>Invoice {inv.no}</h1>
        <button type="button" onClick={() => window.print()} style={{ background: "#fff", color: "var(--pp-dark)", border: 0, borderRadius: 4, padding: "6px 12px", fontWeight: 500 }}>Print / PDF</button>
      </div>
      <article className="inv-sheet">
        <div className="inv-title">Invoice {inv.no}</div>
        <header className="inv-head">
          <BrandLogo size={118} wide />
          <div className="inv-from">
            <div className="inv-lab">From:</div>
            <strong>{a.name}</strong>
            <div>{a.address}</div>
            <div>Contact No: {a.phone}</div>
          </div>
          <div className="inv-paybox">
            <div className="inv-lab">Scan to Pay</div>
            <img src={QR_SRC} alt="PhonePe scan to pay" className="inv-qr" />
          </div>
        </header>
        <div className="inv-meta">{inv.periodFrom} To {inv.periodTo} · Generated: {inv.generatedAt}</div>
        <div className="inv-to">
          <div className="inv-lab">To:</div>
          <strong>{c.name}</strong>
          <div>{c.area}</div>
          <div>Mobile No: {c.phone}</div>
          <div>Group Name: {inv.groupName}</div>
        </div>
        <div className="inv-flags">
          <span>Security Deposit : {money(inv.deposit)}</span>
          <span>Balance Product Qty : {inv.balanceProduct}</span>
        </div>
        <section className="inv-opts">
          <h3>Payment Options</h3>
          <div className="inv-opts-grid">
            <div>
              <div>Paytm:</div>
              <div>Phonepe: {a.pay.phonepe}</div>
              <div>UPI ID: {a.pay.upi}</div>
            </div>
            <div>
              <div>Bank Name: {a.pay.bankName}</div>
              <div>Account No: {a.pay.accountNo}</div>
              <div>IFSC: {a.pay.ifsc}</div>
              <div>A/C Name: {a.pay.accountName}</div>
            </div>
          </div>
        </section>
        <table className="inv-lines">
          <thead>
            <tr><th>#</th><th>Product</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={l.product}><td>{i + 1}</td><td>{l.product}</td><td>{l.qty}</td><td>{money(l.rate)}</td><td>{money(l.amount)}</td></tr>
            ))}
            <tr><td /><td>Total</td><td>{inv.lines.reduce((n, l) => n + l.qty, 0)}</td><td>—</td><td>{money(inv.subtotal)}</td></tr>
          </tbody>
        </table>
        <table className="inv-tot">
          <tbody>
            <tr><td>Subtotal</td><td>{money(inv.subtotal)}</td></tr>
            <tr><td>Past Due Amount</td><td>{money(inv.pastDue)}</td></tr>
            <tr><td>Paid(-)</td><td>-{money(inv.paid)}</td></tr>
            <tr className="inv-due"><td>Amount to pay</td><td>{money(inv.amountToPay)}</td></tr>
          </tbody>
        </table>
        <section>
          <h3>DELIVERED PRODUCT SUMMARY</h3>
          <DailyGrid daily={inv.daily} />
        </section>
      </article>
      <style>{`
        .inv-page { background: #05080f; min-height: 100vh; padding: 16px; }
        .inv-toolbar { display: flex; justify-content: space-between; max-width: 800px; margin: 0 auto 12px; }
        .inv-sheet { max-width: 800px; margin: 0 auto; background: #fff; padding: 22px 24px 28px; color: #111; font-size: 13px; }
        .inv-title { text-align: center; font-size: 22px; font-weight: 700; color: #1a3a6b; margin-bottom: 12px; }
        .inv-head { display: grid; grid-template-columns: 158px 1fr 140px; gap: 14px; align-items: start; border-bottom: 1px solid #cfd8dc; padding-bottom: 12px; }
        .inv-from, .inv-to { line-height: 1.45; }
        .inv-lab { font-size: 12px; color: #546e7a; margin-bottom: 2px; }
        .inv-paybox { text-align: center; }
        .inv-qr { width: 120px; height: auto; display: block; margin: 4px auto 0; }
        .inv-meta { font-size: 12px; color: #546e7a; margin: 8px 0; }
        .inv-to { margin: 8px 0 10px; }
        .inv-flags { display: flex; justify-content: space-between; gap: 12px; font-weight: 600; margin: 8px 0 14px; }
        .inv-opts h3, .inv-sheet h3 { margin: 0 0 8px; font-size: 13px; letter-spacing: .02em; }
        .inv-opts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border: 1px solid #cfd8dc; padding: 10px 12px; }
        .inv-lines, .inv-tot, .inv-daily table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .inv-lines th { background: #1565c0; color: #fff; border: 1px solid #0d47a1; padding: 6px 8px; text-align: left; }
        .inv-lines td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        .inv-tot { max-width: 300px; margin-left: auto; }
        .inv-tot td { padding: 5px 0; }
        .inv-due td { background: #1565c0; color: #fff; font-weight: 700; padding: 7px 8px; }
        .inv-daily table { font-size: 11px; text-align: center; }
        .inv-daily th, .inv-daily td { border: 1px solid #90a4ae; padding: 3px 2px; }
        .inv-daily thead { background: #eceff1; }
        @media print {
          .inv-toolbar, .inv-page { background: #fff; padding: 0; }
          .inv-toolbar { display: none; }
        }
        @media (max-width: 640px) {
          .inv-head { grid-template-columns: 1fr; }
          .inv-opts-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
