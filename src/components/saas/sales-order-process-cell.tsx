import Link from "next/link";
import { Clock } from "lucide-react";
import type { SalesOrderListItem } from "@/lib/leads/sales-order-types";
import { activeProcessSummary } from "@/lib/sales-orders/fms-process-summary";

export function SalesOrderProcessCell({ order }: { order: SalesOrderListItem }) {
  const active = activeProcessSummary(order.fmsInstances);

  if (!active) {
    return <span className="sales-orders-process-empty">—</span>;
  }

  return (
    <Link href={active.href} className="sales-orders-process-link">
      <span className="sales-orders-process-step">{active.step}</span>
      {active.owner ? (
        <span className="sales-orders-process-owner">{active.owner}</span>
      ) : null}
      {active.delayLabel ? (
        <span className="sales-orders-process-delay">
          <Clock size={11} aria-hidden />
          {active.delayLabel}
        </span>
      ) : null}
    </Link>
  );
}
