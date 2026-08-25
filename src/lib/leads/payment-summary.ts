import { formatInr } from "@/lib/leads/categories";

/** Remaining invoice amount after cash + adjustments. Null when no known total. */
export function leadOutstandingBalance(params: {
  invoiceTotal?: string | number | null;
  quotationValue?: string | number | null;
  payments: Array<{
    receivedAmount: string | number;
    paymentType?: string | null;
  }>;
}) {
  const total = money(params.invoiceTotal ?? params.quotationValue);
  if (total <= 0) {
    return null;
  }
  const applied = params.payments.reduce((sum, payment) => {
    return sum + money(payment.receivedAmount);
  }, 0);
  return Math.round((total - applied) * 100) / 100;
}

export function isLeadPaymentAdjustment(type: string | null | undefined) {
  return type === "ADJUSTMENT";
}

function money(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/** CRM Payments tab strip — Total / Received / Adjusted / Due / Last date. */
export function computeLeadPaymentSummary(params: {
  quotationValue?: string | number | null;
  quotations?: Array<{ totalAmount: string | number; lockedAt?: string | null }>;
  payments: Array<{
    receivedAmount: string | number;
    receivedDate: string;
    paymentType?: string | null;
  }>;
}) {
  const quoteTotals = (params.quotations ?? [])
    .map((q) => Number(q.totalAmount))
    .filter((n) => Number.isFinite(n) && n > 0);
  const lockedOrLatest =
    quoteTotals.length > 0
      ? Math.max(...quoteTotals)
      : Number(params.quotationValue ?? 0);
  const total =
    Number.isFinite(lockedOrLatest) && lockedOrLatest > 0 ? lockedOrLatest : 0;

  let received = 0;
  let adjusted = 0;
  for (const payment of params.payments) {
    const amount = money(payment.receivedAmount);
    if (isLeadPaymentAdjustment(payment.paymentType)) {
      adjusted += amount;
    } else {
      received += amount;
    }
  }

  const due = Math.max(0, Math.round((total - received - adjusted) * 100) / 100);

  let lastDate: string | null = null;
  for (const p of params.payments) {
    const t = new Date(p.receivedDate).getTime();
    if (Number.isNaN(t)) continue;
    if (!lastDate || t > new Date(lastDate).getTime()) {
      lastDate = p.receivedDate;
    }
  }

  return {
    total,
    received: Math.round(received * 100) / 100,
    adjusted: Math.round(adjusted * 100) / 100,
    due,
    lastDate,
    totalLabel: formatInr(total),
    receivedLabel: formatInr(received),
    adjustedLabel: formatInr(adjusted),
    dueLabel: formatInr(due),
    lastDateLabel: lastDate
      ? new Date(lastDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—",
  };
}
