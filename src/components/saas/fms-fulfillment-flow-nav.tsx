"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FMS_FULFILLMENT_BASE_PATH,
  PROCESS_FMS_TAB_FLOWS,
  type SalesFulfillmentFmsFlow,
} from "@/lib/fms/sales-fulfillment";

function flowIsActive(pathname: string, flow: SalesFulfillmentFmsFlow, currentFlow: string | null) {
  if (pathname !== FMS_FULFILLMENT_BASE_PATH) {
    return false;
  }
  if (!currentFlow) {
    return flow === "sales-order";
  }
  return currentFlow === flow;
}

export function FmsFulfillmentFlowNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFlow = searchParams.get("flow");

  return (
    <nav className="ws-ffp-tabs" aria-label="Process FMS flows">
      {PROCESS_FMS_TAB_FLOWS.map((item) => {
        const href =
          item.id === "sales-order"
            ? FMS_FULFILLMENT_BASE_PATH
            : `${FMS_FULFILLMENT_BASE_PATH}?flow=${item.id}`;
        const active = flowIsActive(pathname, item.id, currentFlow);
        return (
          <Link
            key={item.id}
            href={href}
            className={`ws-ffp-tab${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
