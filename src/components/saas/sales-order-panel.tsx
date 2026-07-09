"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Package, Truck } from "lucide-react";
import { LeadDeliveryJourney } from "@/components/saas/lead-delivery-journey";
import { formatInr } from "@/lib/leads/categories";
import type { DeliveryLeadTab, LeadDeliveryInput } from "@/lib/leads/delivery-journey";
import {
  salesOrderStatusLabel,
  type LeadSalesOrderData,
} from "@/lib/leads/sales-order-types";
import { buildDispatchPublicUrl } from "@/lib/leads/dispatch-public-url";
import { IMS_SALES_ORDER_STOCK_PATH } from "@/lib/ims/sales-order-stock";
import {
  FMS_FULFILLMENT_DISPATCH_PATH,
  FMS_FULFILLMENT_PO_PATH,
  SALES_OPS_DISPATCH_QUEUE_PATH,
  SALES_OPS_PO_QUEUE_PATH,
} from "@/lib/fms/sales-fulfillment";
import {
  startSalesOrderPo,
  startSalesOrderStockCheck,
} from "@/app/app/sales-orders/actions";

export function SalesOrderPanel({
  leadDelivery,
  salesOrder,
  canManage,
  pending = false,
  startTransition,
  onGoToLeadTab,
}: {
  leadDelivery: LeadDeliveryInput;
  salesOrder: LeadSalesOrderData | null;
  canManage: boolean;
  pending?: boolean;
  startTransition?: (callback: () => Promise<void>) => void;
  onGoToLeadTab?: (tab: DeliveryLeadTab) => void;
}) {
  const router = useRouter();

  const runAction = (action: () => Promise<void>) => {
    const wrapped = async () => {
      await action();
      router.refresh();
    };
    if (!startTransition) {
      void wrapped();
      return;
    }
    startTransition(wrapped);
  };

  const dispatchUrl =
    salesOrder?.dispatchShareToken != null
      ? buildDispatchPublicUrl(salesOrder.dispatchShareToken)
      : null;

  return (
    <section className="leads-drawer-section sales-order-panel">
      <LeadDeliveryJourney
        lead={leadDelivery}
        variant="drawer"
        onGoToLeadTab={onGoToLeadTab}
      />

      {salesOrder ? (
        <div className="delivery-order-card">
          <div className="sales-order-panel-head">
            <div>
              <p className="delivery-order-eyebrow">Linked sales order</p>
              <h3>{salesOrder.orderNumber}</h3>
              <span
                className={`sales-order-status-badge status-${salesOrder.status.toLowerCase()}`}
              >
                {salesOrderStatusLabel(salesOrder.status)}
              </span>
            </div>
            <Link
              className="btn-secondary btn-sm"
              href={`/app/sales-orders/${salesOrder.id}`}
            >
              Open in Sales Orders
            </Link>
          </div>

          <dl className="sales-order-metrics">
            <div>
              <dt>Order value</dt>
              <dd>{formatInr(Number(salesOrder.orderValue))}</dd>
            </div>
            <div>
              <dt>Advance</dt>
              <dd>{formatInr(Number(salesOrder.advanceAmount))}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd>{formatInr(Number(salesOrder.balanceAmount))}</dd>
            </div>
          </dl>

          {canManage ? (
            <div className="sales-order-cta-row">
              <Link className="btn-secondary btn-sm" href={IMS_SALES_ORDER_STOCK_PATH}>
                <Package size={14} aria-hidden />
                Open IMS
              </Link>

              {!salesOrder.stockCheckFmsInstanceId &&
              (salesOrder.status === "CONFIRMED" ||
                salesOrder.status === "STOCK_CHECK") ? (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={pending}
                  onClick={() =>
                    runAction(async () => {
                      await startSalesOrderStockCheck(salesOrder.id);
                    })
                  }
                >
                  <Package size={14} aria-hidden />
                  Start IMS stock check
                </button>
              ) : null}

              {salesOrder.status === "PO_PENDING" && !salesOrder.poFmsInstanceId ? (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={pending}
                  onClick={() =>
                    runAction(async () => {
                      await startSalesOrderPo(salesOrder.id);
                    })
                  }
                >
                  Start PO FMS
                </button>
              ) : null}

              {salesOrder.poFmsInstanceId ? (
                <Link
                  className="btn-secondary btn-sm"
                  href={`/app/fms/instances/${salesOrder.poFmsInstanceId}`}
                >
                  Track PO in FMS
                </Link>
              ) : salesOrder.status === "PO_PENDING" ? (
                <Link className="btn-secondary btn-sm" href={SALES_OPS_PO_QUEUE_PATH}>
                  PO orders queue
                </Link>
              ) : null}

              {salesOrder.dispatchFmsInstanceId ? (
                <Link
                  className="btn-secondary btn-sm"
                  href={`/app/fms/instances/${salesOrder.dispatchFmsInstanceId}`}
                >
                  <Truck size={14} aria-hidden />
                  Track dispatch in FMS
                </Link>
              ) : salesOrder.status === "DISPATCH_PENDING" ||
                salesOrder.status === "DISPATCHED" ? (
                <Link
                  className="btn-secondary btn-sm"
                  href={SALES_OPS_DISPATCH_QUEUE_PATH}
                >
                  <Truck size={14} aria-hidden />
                  Dispatch orders queue
                </Link>
              ) : null}

              {salesOrder.poFmsInstanceId || salesOrder.dispatchFmsInstanceId ? (
                <Link
                  className="btn-secondary btn-sm"
                  href={
                    salesOrder.dispatchFmsInstanceId
                      ? FMS_FULFILLMENT_DISPATCH_PATH
                      : FMS_FULFILLMENT_PO_PATH
                  }
                >
                  FMS process board
                </Link>
              ) : null}

              {dispatchUrl ? (
                <a
                  className="btn-secondary btn-sm"
                  href={dispatchUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} aria-hidden />
                  Dispatch slip
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
