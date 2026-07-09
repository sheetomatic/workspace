"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ExternalLink, Package, Truck } from "lucide-react";
import type { SalesOrderStatus } from "@/lib/leads/sales-order-types";
import { IMS_SALES_ORDER_STOCK_PATH } from "@/lib/ims/sales-order-stock";
import {
  FMS_FULFILLMENT_DISPATCH_PATH,
  FMS_FULFILLMENT_PO_PATH,
  SALES_OPS_DISPATCH_QUEUE_PATH,
  SALES_OPS_PO_QUEUE_PATH,
} from "@/lib/fms/sales-fulfillment";

export function SalesOrderDetailActions({
  orderId,
  status,
  hasStockCheck,
  hasPo,
  poFmsInstanceId,
  dispatchFmsInstanceId,
  dispatchUrl,
  startStockCheck,
  startPo,
}: {
  orderId: string;
  status: SalesOrderStatus;
  hasStockCheck: boolean;
  hasPo: boolean;
  poFmsInstanceId: string | null;
  dispatchFmsInstanceId: string | null;
  dispatchUrl: string | null;
  startStockCheck: (orderId: string) => Promise<{ ok: boolean }>;
  startPo: (orderId: string) => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runAction = (action: () => Promise<{ ok: boolean }>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  return (
    <div className="sales-order-cta-row">
      <Link className="btn-secondary btn-sm" href={IMS_SALES_ORDER_STOCK_PATH}>
        <Package size={14} aria-hidden />
        Open IMS
      </Link>

      {!hasStockCheck && (status === "CONFIRMED" || status === "STOCK_CHECK") ? (
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={pending}
          onClick={() => runAction(() => startStockCheck(orderId))}
        >
          <Package size={14} aria-hidden />
          Start IMS stock check
        </button>
      ) : null}

      {status === "PO_PENDING" && !hasPo ? (
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={pending}
          onClick={() => runAction(() => startPo(orderId))}
        >
          Start PO FMS
        </button>
      ) : null}

      {poFmsInstanceId ? (
        <Link
          className="btn-secondary btn-sm"
          href={`/app/fms/instances/${poFmsInstanceId}`}
        >
          Track PO in FMS
        </Link>
      ) : status === "PO_PENDING" ? (
        <Link className="btn-secondary btn-sm" href={SALES_OPS_PO_QUEUE_PATH}>
          PO orders queue
        </Link>
      ) : null}

      {dispatchFmsInstanceId ? (
        <Link
          className="btn-secondary btn-sm"
          href={`/app/fms/instances/${dispatchFmsInstanceId}`}
        >
          <Truck size={14} aria-hidden />
          Track dispatch in FMS
        </Link>
      ) : status === "DISPATCH_PENDING" || status === "DISPATCHED" ? (
        <Link className="btn-secondary btn-sm" href={SALES_OPS_DISPATCH_QUEUE_PATH}>
          <Truck size={14} aria-hidden />
          Dispatch orders queue
        </Link>
      ) : null}

      {poFmsInstanceId || dispatchFmsInstanceId ? (
        <Link
          className="btn-secondary btn-sm"
          href={
            dispatchFmsInstanceId
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
  );
}
