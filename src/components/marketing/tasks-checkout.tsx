"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { GST_STATE_OPTIONS } from "@/lib/leads/gst-invoice";
import { TASKS_MONTHLY_MINIMUM_USERS } from "@/lib/tasks/checkout-commerce";
import { loadRazorpayCheckoutScript } from "./razorpay-checkout-loader";

type Props = { enabled: boolean };
type Buyer = { name: string; email: string; phone: string; billedTo: string; address: string; city: string; stateCode: string; pin: string; gstin: string };
type RzpOrder = { id: string; paid: boolean; paymentState: string; totalPaise: number; gatewayOrderId: string | null; keyId: string | null; invoiceNumber: string | null };

const format = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
function token() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export function TasksCheckout({ enabled }: Props) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [users, setUsers] = useState(8);
  const [whatsappApi, setWhatsappApi] = useState(false);
  const [buyer, setBuyer] = useState<Buyer>({ name: "", email: "", phone: "", billedTo: "", address: "", city: "", stateCode: "", pin: "", gstin: "" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const accessToken = useRef<string | null>(null);
  const billedUsers = period === "monthly" ? Math.max(users, TASKS_MONTHLY_MINIMUM_USERS) : users;
  const tasksSubtotal = period === "monthly" ? billedUsers * 300 : users * 2500;
  const subtotal = tasksSubtotal + (whatsappApi ? 10000 : 0);
  const gst = Math.round(subtotal * 0.18);

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy) return;
    setBusy(true); setMessage("");
    try {
      if (!accepted) throw new Error("Please accept the plan and renewal terms to continue.");
      await loadRazorpayCheckoutScript();
      const Razorpay = window.Razorpay as unknown as (new (options: Record<string, unknown>) => { open: () => void }) | undefined;
      if (!Razorpay) throw new Error("Razorpay could not be loaded.");
      accessToken.current ??= token();
      const currentToken = accessToken.current;
      const response = await fetch("/api/tasks/checkout", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` }, body: JSON.stringify({ period, users, whatsappApi, buyer, acceptedTerms: true }) });
      const order = await response.json() as RzpOrder & { error?: string };
      if (!response.ok) throw new Error(order.error || "Checkout could not be created.");
      if (!order.gatewayOrderId || !order.keyId || order.paymentState === "creating") throw new Error("Order creation is pending. Do not retry payment yet; contact support with order reference " + order.id + ".");
      const gateway = new Razorpay({ key: order.keyId, order_id: order.gatewayOrderId, amount: order.totalPaise, currency: "INR", name: "Sheetomatic Technologies", description: `Tasks Management · ${period} plan`, prefill: { name: buyer.name, email: buyer.email, contact: buyer.phone }, handler: async (result: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        setMessage("Payment received by checkout; verifying with Razorpay. The GST invoice is issued only after server verification.");
        try {
          const verified = await fetch(`/api/templates/checkout/${order.id}`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` }, body: JSON.stringify(result) });
          const data = await verified.json();
          if (!verified.ok) throw new Error(data.error || "Payment verification is pending.");
          setMessage(`Payment verified. Invoice ${data.invoiceNumber} will be emailed to ${buyer.email}.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Payment verification is pending. Check status before retrying."); }
      }, modal: { ondismiss: () => setMessage("Checkout closed. No paid invoice is created unless Razorpay confirms a captured payment.") } });
      gateway.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout could not be started."); }
    finally { setBusy(false); }
  }

  return <div className="tasks-checkout" id="tasks-checkout">
    <div className="tasks-checkout-intro"><div><span className="tasks-checkout-kicker">Secure card checkout</span><h3>Choose your Tasks plan</h3><p>Hosted payment through Razorpay. We do not collect or store card details.</p></div><div className="tasks-checkout-total"><span>Estimated total with 18% GST</span><strong>{format(subtotal + gst)}</strong></div></div>
    <form onSubmit={pay}>
      <div className="tasks-checkout-controls">
        <label>Billing period<select value={period} onChange={e => setPeriod(e.target.value as "monthly" | "yearly")}><option value="monthly">Monthly · 8-user minimum</option><option value="yearly">Yearly · selected users</option></select></label>
        <label>Users <input type="number" min={1} max={250} value={users} onChange={e => setUsers(Math.min(250, Math.max(1, Number(e.target.value) || 1)))} /></label>
      </div>
      {period === "monthly" && users < TASKS_MONTHLY_MINIMUM_USERS && <p className="tasks-checkout-minimum">Monthly billing has an 8-user minimum. You selected {users}; {billedUsers} users will be billed at ₹300 each.</p>}
      <label className="tasks-checkout-addon"><input type="checkbox" checked={whatsappApi} onChange={e => setWhatsappApi(e.target.checked)} /><span><strong>Optional WhatsApp API · ₹10,000/year</strong><small>Annual add-on term. Provider usage charges may apply separately.</small></span></label>
      <fieldset className="tasks-checkout-buyer"><legend>Billing and GST invoice details</legend>
        <label>Name<input autoComplete="name" required maxLength={120} value={buyer.name} onChange={e => setBuyer({ ...buyer, name: e.target.value })} /></label>
        <label>Email<input type="email" autoComplete="email" required maxLength={254} value={buyer.email} onChange={e => setBuyer({ ...buyer, email: e.target.value })} /></label>
        <label>Phone<input type="tel" autoComplete="tel" required value={buyer.phone} onChange={e => setBuyer({ ...buyer, phone: e.target.value })} /></label>
        <label>Business / billed to<input autoComplete="organization" maxLength={200} value={buyer.billedTo} onChange={e => setBuyer({ ...buyer, billedTo: e.target.value })} /></label>
        <label>Billing address<input autoComplete="street-address" required maxLength={500} value={buyer.address} onChange={e => setBuyer({ ...buyer, address: e.target.value })} /></label>
        <label>City<input autoComplete="address-level2" required maxLength={80} value={buyer.city} onChange={e => setBuyer({ ...buyer, city: e.target.value })} /></label>
        <label>State<select autoComplete="address-level1" required value={buyer.stateCode} onChange={e => setBuyer({ ...buyer, stateCode: e.target.value })}><option value="">Choose state</option>{GST_STATE_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}</select></label>
        <label>PIN code<input autoComplete="postal-code" required inputMode="numeric" maxLength={6} value={buyer.pin} onChange={e => setBuyer({ ...buyer, pin: e.target.value })} /></label>
        <label>GSTIN (optional)<input autoComplete="off" maxLength={15} value={buyer.gstin} onChange={e => setBuyer({ ...buyer, gstin: e.target.value.toUpperCase() })} /></label>
      </fieldset>
      <dl className="tasks-checkout-summary"><div><dt>{period === "monthly" ? `Tasks · ${billedUsers} billed users × ₹300` : `Tasks · ${users} users × ₹2,500/year`}</dt><dd>{format(tasksSubtotal)}</dd></div>{whatsappApi && <div><dt>WhatsApp API · 1 year</dt><dd>{format(10000)}</dd></div>}<div><dt>Subtotal before GST</dt><dd>{format(subtotal)}</dd></div><div><dt>GST estimate · 18%</dt><dd>{format(gst)}</dd></div><div className="tasks-checkout-grand-total"><dt>Estimated total</dt><dd>{format(subtotal + gst)}</dd></div></dl>
      <label className="tasks-checkout-consent"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />I understand monthly pricing has an 8-user minimum; yearly pricing is per selected user; GST is added; and this is a fixed-term purchase with manual renewal, not an automatic recurring charge. I agree to the <Link href="/terms" target="_blank">terms</Link>.</label>
      {!enabled && <p className="tasks-checkout-unavailable" role="status">Online payment is currently unavailable while payment configuration and seller GST verification are completed. No payment will be collected. Please enquire below.</p>}
      {message && <p className="tasks-checkout-message" role="status">{message}</p>}
      <button className="tasks-checkout-button" type="submit" disabled={!enabled || busy}>{busy ? "Preparing secure checkout…" : `Continue to secure payment · ${format(subtotal + gst)}`}</button>
      <p className="tasks-checkout-footnote">GST is estimated at 18%; the server calculates the tax split from your billing state. A paid GST invoice is generated only after Razorpay verifies successful capture.</p>
    </form>
  </div>;
}
