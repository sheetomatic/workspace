"use client";
import { useActionState } from "react";
import { confirmCartPaymentAction } from "@/app/app/template-orders/cart-actions";
import { inr } from "@/lib/templates/commerce";

export type CartReview = {
  id: string;
  buyer: string;
  email: string;
  names: string[];
  reference: string;
  totalPaise: number;
  invoiceNumber: string | null;
  emailed: boolean;
  createdAt: string;
};
function CartReviewCard({ order }: { order: CartReview }) {
  const [state, action, pending] = useActionState(confirmCartPaymentAction, {
    message: "",
  });
  return (
    <article
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <h3>
        {order.buyer} · {inr(order.totalPaise)} including GST
      </h3>
      <p>
        {order.email} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
      </p>
      <p>{order.names.join(" · ")}</p>
      <p>
        Order: {order.id}
        <br />
        Claimed receipt: <strong>{order.reference}</strong>
      </p>
      {order.invoiceNumber && (
        <p>
          Verified · Invoice {order.invoiceNumber} ·{" "}
          {order.emailed
            ? "Email delivered to provider"
            : "Email pending — retry below"}
        </p>
      )}
      {(!order.invoiceNumber || !order.emailed) && (
        <form
          action={action}
          style={{ display: "grid", gap: 12, maxWidth: 560 }}
        >
          <input type="hidden" name="id" value={order.id} />
          <label>
            Razorpay payment ID (check against merchant account)
            <input
              name="reference"
              required
              pattern="pay_[a-zA-Z0-9]{6,80}"
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Captured amount including GST (₹)
            <input
              name="amountInr"
              inputMode="decimal"
              required
              pattern="[0-9]+([.][0-9]{1,2})?"
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            <input name="verified" type="checkbox" required /> I checked this
            payment in the Sheetomatic merchant account: captured, not refunded,
            exact total and buyer, and not used for another order.
          </label>
          <button type="submit" disabled={pending}>
            {pending
              ? "Confirming…"
              : order.invoiceNumber
                ? "Retry delivery email"
                : "Confirm payment & issue GST invoice"}
          </button>
        </form>
      )}
      <p role="status">{state.message}</p>
    </article>
  );
}
export function TemplateCartOrdersPanel({ orders }: { orders: CartReview[] }) {
  return (
    <section aria-label="Template cart payment reviews">
      <h2>Cart payments — merchant verification required</h2>
      <p>
        Customer-submitted references are not proof of payment. Verify in
        Razorpay before approving. Invoices and private copy links stay locked
        until approval.
      </p>
      {orders.length ? (
        orders.map((o) => <CartReviewCard key={o.id} order={o} />)
      ) : (
        <p>No cart receipts awaiting review.</p>
      )}
    </section>
  );
}
