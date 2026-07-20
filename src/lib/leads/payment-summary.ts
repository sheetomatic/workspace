import { formatInr } from "@/lib/leads/categories";

/** CRM Payments tab strip — Total / Received / Due / Last date. */
export function computeLeadPaymentSummary(params: {
  quotationValue?: string | number | null;
  quotations?: Array<{ totalAmount: string | number; lockedAt?: string | null }>;
  payments: Array<{
    receivedAmount: string | number;
    receivedDate: string;
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

  const received = params.payments.reduce((sum, p) => {
    const amount = Number(p.receivedAmount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const due = Math.max(0, Math.round((total - received) * 100) / 100);

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
    due,
    lastDate,
    totalLabel: formatInr(total),
    receivedLabel: formatInr(received),
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
