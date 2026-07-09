import type {
  LeadSalesOrderData,
  OrderJourneyStageKey,
  SalesOrderFmsRole,
} from "@/lib/leads/sales-order-types";
import { ORDER_JOURNEY_STAGES, salesOrderStatusLabel } from "@/lib/leads/sales-order-types";
import { IMS_SALES_ORDER_STOCK_PATH } from "@/lib/ims/sales-order-stock";
import {
  SALES_OPS_DISPATCH_QUEUE_PATH,
  SALES_OPS_PO_QUEUE_PATH,
} from "@/lib/fms/sales-fulfillment";

export type DeliveryStepState = "done" | "active" | "pending" | "skipped";

export type DeliveryJourneyStep = {
  key: OrderJourneyStageKey;
  label: string;
  state: DeliveryStepState;
  statusLabel: string;
  detail?: string;
  nextAction?: string;
  href?: string;
};

export type LeadDeliveryInput = {
  quotations: Array<{
    id: string;
    quotationNumber: string;
    status: string;
    lockedAt: string | null;
    sentAt: string | null;
  }>;
  payments: Array<{
    paymentType: string;
    receivedAmount: string | number;
  }>;
  salesOrder: LeadSalesOrderData | null;
};

function fmsInstanceId(
  order: LeadSalesOrderData | null,
  role: SalesOrderFmsRole | "SALES_ORDER",
) {
  if (!order) {
    return null;
  }
  if (role === "SALES_ORDER") {
    return (
      order.fmsInstances.find((item) => item.role === "OTHER")?.id ??
      order.fmsInstances.find((item) =>
        item.templateName.toLowerCase().includes("sales order"),
      )?.id ??
      null
    );
  }
  if (role === "PO") {
    return order.poFmsInstanceId;
  }
  if (role === "STOCK_CHECK") {
    return order.stockCheckFmsInstanceId;
  }
  if (role === "DISPATCH") {
    return order.dispatchFmsInstanceId;
  }
  return null;
}

function fmsInstanceStatus(order: LeadSalesOrderData | null, instanceId: string | null) {
  if (!order || !instanceId) {
    return null;
  }
  return order.fmsInstances.find((item) => item.id === instanceId)?.status ?? null;
}

function hasAdvancePayment(input: LeadDeliveryInput) {
  return input.payments.some((payment) => payment.paymentType === "ADVANCE");
}

function lockedQuotation(input: LeadDeliveryInput) {
  return input.quotations.find(
    (quote) => quote.status === "LOCKED" || quote.lockedAt != null,
  );
}

function latestQuotation(input: LeadDeliveryInput) {
  return input.quotations[0] ?? null;
}

function stepStateFromIndex(
  index: number,
  activeIndex: number,
  skipped = false,
): DeliveryStepState {
  if (skipped) {
    return "skipped";
  }
  if (index < activeIndex) {
    return "done";
  }
  if (index === activeIndex) {
    return "active";
  }
  return "pending";
}

export function buildDeliveryJourney(input: LeadDeliveryInput): DeliveryJourneyStep[] {
  const order = input.salesOrder;
  const locked = lockedQuotation(input);
  const latest = latestQuotation(input);
  const advancePaid = hasAdvancePayment(input);
  const soFmsId = fmsInstanceId(order, "SALES_ORDER");
  const stockFmsId = order?.stockCheckFmsInstanceId ?? null;
  const poFmsId = order?.poFmsInstanceId ?? null;
  const dispatchFmsId = order?.dispatchFmsInstanceId ?? null;

  let activeKey: OrderJourneyStageKey = "lead";

  if (order?.status === "DELIVERED") {
    activeKey = "delivered";
  } else if (
    order?.status === "DISPATCHED" ||
    order?.status === "DISPATCH_PENDING" ||
    dispatchFmsId
  ) {
    activeKey = "dispatch";
  } else if (
    order?.status === "PO_PENDING" ||
    order?.status === "PO_IN_PROGRESS" ||
    poFmsId
  ) {
    activeKey = "po";
  } else if (order?.status === "STOCK_CHECK" || stockFmsId) {
    activeKey = "stock";
  } else if (order && order.status !== "DRAFT") {
    activeKey = "so";
  } else if (order || advancePaid || locked) {
    activeKey = "so";
  } else if (latest?.sentAt || latest?.status === "SENT") {
    activeKey = "advance";
  } else if (latest) {
    activeKey = "quote";
  }

  const activeIndex = ORDER_JOURNEY_STAGES.findIndex((stage) => stage.key === activeKey);

  const poSkipped =
    Boolean(order) &&
    !poFmsId &&
    order!.status !== "PO_PENDING" &&
    order!.status !== "PO_IN_PROGRESS" &&
    activeIndex > ORDER_JOURNEY_STAGES.findIndex((s) => s.key === "po");

  return ORDER_JOURNEY_STAGES.map((stage, index) => {
    switch (stage.key) {
      case "lead":
        return {
          key: stage.key,
          label: stage.label,
          state: stepStateFromIndex(index, activeIndex),
          statusLabel: "Captured",
          detail: "Lead is in CRM",
        };
      case "quote": {
        const done = Boolean(locked || latest?.sentAt || latest?.status === "SENT");
        const state = done
          ? "done"
          : latest
            ? "active"
            : stepStateFromIndex(index, activeIndex);
        return {
          key: stage.key,
          label: stage.label,
          state,
          statusLabel: locked
            ? "Approved"
            : latest?.sentAt
              ? "Sent"
              : latest
                ? "Draft"
                : "Not started",
          detail: latest?.quotationNumber,
          nextAction:
            state === "active" && !latest?.sentAt
              ? "Create and send quotation from Quote tab"
              : undefined,
        };
      }
      case "advance": {
        const done = advancePaid || Boolean(locked);
        const state = done
          ? "done"
          : latest?.sentAt && !locked
            ? "active"
            : stepStateFromIndex(index, activeIndex);
        return {
          key: stage.key,
          label: stage.label,
          state,
          statusLabel: done ? "Received" : "Pending",
          nextAction:
            state === "active"
              ? "Record ADVANCE payment in Payments tab (locks quotation)"
              : undefined,
        };
      }
      case "so": {
        if (!order) {
          return {
            key: stage.key,
            label: stage.label,
            state: stepStateFromIndex(index, activeIndex),
            statusLabel: "Waiting",
            nextAction:
              activeKey === "so" && advancePaid
                ? "Advance recorded — sales order will auto-create"
                : "Complete advance payment first",
          };
        }
        const soFmsStatus = fmsInstanceStatus(order, soFmsId);
        const state =
          order.status === "CONFIRMED" ||
          order.status === "STOCK_CHECK" ||
          soFmsStatus === "COMPLETED"
            ? "done"
            : soFmsStatus === "ACTIVE"
              ? "active"
              : stepStateFromIndex(index, activeIndex);
        return {
          key: stage.key,
          label: stage.label,
          state,
          statusLabel: salesOrderStatusLabel(order.status),
          detail: order.orderNumber,
          href: `/app/sales-orders/${order.id}`,
          nextAction:
            state === "active"
              ? "Complete Sales Order FMS (Order Entry → Approval)"
              : state === "done" && !stockFmsId
                ? "Verify stock in IMS when ready"
                : undefined,
        };
      }
      case "stock": {
        if (!order) {
          return {
            key: stage.key,
            label: stage.label,
            state: "pending",
            statusLabel: "—",
          };
        }
        const stockFmsStatus = fmsInstanceStatus(order, stockFmsId);
        const state =
          order.status === "PO_PENDING" ||
          order.status === "DISPATCH_PENDING" ||
          order.status === "DISPATCHED" ||
          order.status === "DELIVERED" ||
          stockFmsStatus === "COMPLETED"
            ? "done"
            : stockFmsStatus === "ACTIVE"
              ? "active"
              : stepStateFromIndex(index, activeIndex);
        return {
          key: stage.key,
          label: stage.label,
          state,
          statusLabel: stockFmsId
            ? (stockFmsStatus ?? "In progress")
            : order.status === "CONFIRMED"
              ? "Ready to start"
              : "Pending",
          href: stockFmsId
            ? `/app/fms/instances/${stockFmsId}`
            : IMS_SALES_ORDER_STOCK_PATH,
          nextAction:
            state === "active"
              ? "Verify on-hand stock in IMS, then complete Fulfillment Decision in FMS."
              : order.status === "CONFIRMED" && !stockFmsId
                ? "Open IMS — check stock levels against the sales order."
                : undefined,
        };
      }
      case "po": {
        if (!order) {
          return {
            key: stage.key,
            label: stage.label,
            state: "pending",
            statusLabel: "—",
          };
        }
        const poFmsStatus = fmsInstanceStatus(order, poFmsId);
        const state = poSkipped
          ? "skipped"
          : poFmsStatus === "COMPLETED" ||
              order.status === "DISPATCH_PENDING" ||
              order.status === "DISPATCHED" ||
              order.status === "DELIVERED"
            ? "done"
            : poFmsStatus === "ACTIVE" || order.status === "PO_PENDING"
              ? "active"
              : stepStateFromIndex(index, activeIndex);
        return {
          key: stage.key,
          label: stage.label,
          state,
          statusLabel: poSkipped
            ? "Not required"
            : poFmsId
              ? (poFmsStatus ?? "In progress")
              : order.status === "PO_PENDING"
                ? "Required"
                : "—",
          href: poFmsId
            ? `/app/fms/instances/${poFmsId}`
            : order
              ? `/app/sales-orders/${order.id}`
              : SALES_OPS_PO_QUEUE_PATH,
          nextAction:
            state === "active" && !poFmsId
              ? "Open the sales order and start Purchase Order FMS for process tracking."
              : state === "active"
                ? "Complete PO FMS stops (vendor → receive goods) — FMS tracks who and delay."
                : undefined,
        };
      }
      case "dispatch": {
        if (!order) {
          return {
            key: stage.key,
            label: stage.label,
            state: "pending",
            statusLabel: "—",
          };
        }
        const dispatchFmsStatus = fmsInstanceStatus(order, dispatchFmsId);
        const state =
          order.status === "DELIVERED" || dispatchFmsStatus === "COMPLETED"
            ? "done"
            : dispatchFmsStatus === "ACTIVE" ||
                order.status === "DISPATCHED" ||
                order.status === "DISPATCH_PENDING"
              ? "active"
              : stepStateFromIndex(index, activeIndex);
        return {
          key: stage.key,
          label: stage.label,
          state,
          statusLabel: dispatchFmsId
            ? (dispatchFmsStatus ?? "In transit")
            : "Pending",
          href: dispatchFmsId
            ? `/app/fms/instances/${dispatchFmsId}`
            : order
              ? `/app/sales-orders/${order.id}`
              : SALES_OPS_DISPATCH_QUEUE_PATH,
          nextAction:
            state === "active"
              ? "Walk Pack → Load → Dispatch → Confirm → Notify"
              : undefined,
        };
      }
      case "delivered":
        return {
          key: stage.key,
          label: stage.label,
          state: order?.status === "DELIVERED" ? "done" : stepStateFromIndex(index, activeIndex),
          statusLabel: order?.status === "DELIVERED" ? "Complete" : "Pending",
          href: order?.id ? `/app/sales-orders/${order.id}` : undefined,
        };
      default: {
        const unreachable = stage as { key: OrderJourneyStageKey; label: string };
        return {
          key: unreachable.key,
          label: unreachable.label,
          state: stepStateFromIndex(index, activeIndex),
          statusLabel: "—",
        };
      }
    }
  });
}

export function deliveryJourneySummary(steps: DeliveryJourneyStep[]) {
  const active = steps.find((step) => step.state === "active");
  if (active) {
    return `${active.label}: ${active.statusLabel}`;
  }
  const lastDone = [...steps].reverse().find((step) => step.state === "done");
  return lastDone ? `${lastDone.label} done` : "Lead";
}

export type DeliveryLeadTab = "quote" | "payments";

export type DeliveryNextAction = {
  phase: "leads" | "sales_orders";
  phaseLabel: string;
  title: string;
  description: string;
  primaryLabel: string;
  leadTab?: DeliveryLeadTab;
  href?: string;
};

export function countCompletedStages(steps: DeliveryJourneyStep[]) {
  return steps.filter((step) => step.state === "done").length;
}

export const PRE_SALES_STAGES = [
  { key: "quote", label: "Quotation" },
  { key: "advance", label: "Advance" },
  { key: "so", label: "Sales order" },
] as const;

export const FULFILLMENT_STAGES = [
  { key: "stock", label: "IMS" },
  { key: "po", label: "Purchase order" },
  { key: "dispatch", label: "Dispatch" },
  { key: "delivered", label: "Delivered" },
] as const;

export type DeliveryPipelineMode = "pre_sales" | "fulfillment" | "full";

export function getDeliveryPipelineMode(input: LeadDeliveryInput): DeliveryPipelineMode {
  return input.salesOrder ? "fulfillment" : "pre_sales";
}

function latestQuotationForJourney(input: LeadDeliveryInput) {
  return input.quotations[0] ?? null;
}

export function buildPreSalesJourney(input: LeadDeliveryInput): DeliveryJourneyStep[] {
  const latest = latestQuotationForJourney(input);
  const locked = lockedQuotation(input);
  const quoteSent = Boolean(latest?.sentAt || latest?.status === "SENT" || locked);
  const advancePaid = hasAdvancePayment(input);
  const hasOrder = Boolean(input.salesOrder);

  let activeKey: (typeof PRE_SALES_STAGES)[number]["key"] = "quote";
  if (hasOrder) {
    activeKey = "so";
  } else if (advancePaid || locked) {
    activeKey = "so";
  } else if (quoteSent) {
    activeKey = "advance";
  } else if (latest) {
    activeKey = "quote";
  }

  const activeIndex = PRE_SALES_STAGES.findIndex((stage) => stage.key === activeKey);

  return PRE_SALES_STAGES.map((stage, index) => {
    if (stage.key === "quote") {
      const done = quoteSent;
      const state = done ? "done" : index === activeIndex ? "active" : "pending";
      return {
        key: "quote",
        label: stage.label,
        state,
        statusLabel: locked ? "Locked" : quoteSent ? "Sent" : latest ? "Draft" : "Not started",
        detail: latest?.quotationNumber,
        nextAction:
          state === "active"
            ? "Create and send the quotation from the Quotation tab."
            : undefined,
      };
    }

    if (stage.key === "advance") {
      const done = advancePaid || locked;
      const state = done ? "done" : index === activeIndex ? "active" : "pending";
      return {
        key: "advance",
        label: stage.label,
        state,
        statusLabel: done ? "Received" : quoteSent ? "Pending" : "Waiting",
        nextAction:
          state === "active"
            ? "Record advance payment in Payments. This locks the quote and creates the sales order."
            : undefined,
      };
    }

    const done = hasOrder;
    const state = done ? "done" : index === activeIndex ? "active" : "pending";
    return {
      key: "so",
      label: stage.label,
      state,
      statusLabel: done
        ? "Created"
        : advancePaid
          ? "Creating"
          : "Waiting",
      detail: input.salesOrder?.orderNumber,
      href: input.salesOrder ? `/app/sales-orders/${input.salesOrder.id}` : undefined,
      nextAction:
        state === "active" && !hasOrder
          ? advancePaid
            ? "Sales order is created automatically after advance is recorded."
            : "Complete quotation and advance payment first."
          : undefined,
    };
  });
}

export function buildFulfillmentJourney(input: LeadDeliveryInput): DeliveryJourneyStep[] {
  const full = buildDeliveryJourney(input);
  return FULFILLMENT_STAGES.map((stage) => {
    const step = full.find((item) => item.key === stage.key);
    return step ?? {
      key: stage.key,
      label: stage.label,
      state: "pending" as const,
      statusLabel: "—",
    };
  });
}

export function getDeliveryProgress(steps: DeliveryJourneyStep[]) {
  const total = steps.length;
  const done = countCompletedStages(steps);
  const activeIndex = steps.findIndex((step) => step.state === "active");
  const current = activeIndex >= 0 ? activeIndex + 1 : Math.min(done + 1, total);
  return { current, total, done };
}

function isGenericStepDetail(detail?: string) {
  return detail === "Lead is in CRM";
}

export function getDeliveryNextAction(
  steps: DeliveryJourneyStep[],
  salesOrderId?: string | null,
  mode: DeliveryPipelineMode = salesOrderId ? "fulfillment" : "pre_sales",
): DeliveryNextAction {
  const active = steps.find((step) => step.state === "active");

  if (mode === "full") {
    const key = active?.key ?? "lead";

    if (key === "quote") {
      return {
        phase: "leads",
        phaseLabel: "Pre-sales",
        title: "Send quotation",
        description:
          active?.nextAction ??
          "Build and send the quotation before recording advance.",
        primaryLabel: "Open quotation",
        leadTab: "quote",
      };
    }

    if (key === "advance") {
      return {
        phase: "leads",
        phaseLabel: "Pre-sales",
        title: "Record advance payment",
        description:
          active?.nextAction ??
          "Advance locks the quote and creates the sales order.",
        primaryLabel: "Open payments",
        leadTab: "payments",
      };
    }

    if (!salesOrderId && (key === "so" || key === "lead")) {
      return {
        phase: "leads",
        phaseLabel: "Pre-sales",
        title: key === "lead" ? "Create quotation" : "Waiting for advance",
        description:
          key === "lead"
            ? "Start with a quotation for this lead."
            : "Complete quotation and advance payment to create the sales order.",
        primaryLabel: key === "lead" ? "Open quotation" : "Open payments",
        leadTab: key === "lead" ? "quote" : "payments",
      };
    }

    if (key === "delivered" && active?.state === "done") {
      return {
        phase: "sales_orders",
        phaseLabel: "Fulfillment",
        title: "Delivered",
        description: "Order fulfillment is complete.",
        primaryLabel: "View sales order",
        href: salesOrderId ? `/app/sales-orders/${salesOrderId}` : "/app/sales-orders",
      };
    }

    if (key === "stock") {
      return {
        phase: "sales_orders",
        phaseLabel: "Fulfillment",
        title: "Verify stock in IMS",
        description:
          active?.nextAction ??
          "Check IMS stock levels against the sales order lines.",
        primaryLabel: "Open IMS",
        href: IMS_SALES_ORDER_STOCK_PATH,
      };
    }

    if (key === "po") {
      const hasPoFms = Boolean(active?.href?.includes("/app/fms/instances/"));
      return {
        phase: "sales_orders",
        phaseLabel: "Fulfillment",
        title: hasPoFms
          ? "Track purchase order process in FMS"
          : "Continue purchase order work",
        description:
          active?.nextAction ??
          (hasPoFms
            ? "FMS shows who owns the stop and any time delay through receive goods."
            : "Open the sales order to start Purchase Order FMS for this order."),
        primaryLabel: hasPoFms ? "Open PO FMS" : "Open sales order",
        href:
          active?.href ??
          (salesOrderId
            ? `/app/sales-orders/${salesOrderId}`
            : SALES_OPS_PO_QUEUE_PATH),
      };
    }

    if (key === "dispatch") {
      const hasDispatchFms = Boolean(active?.href?.includes("/app/fms/instances/"));
      return {
        phase: "sales_orders",
        phaseLabel: "Fulfillment",
        title: hasDispatchFms
          ? "Track dispatch process in FMS"
          : "Continue dispatch work",
        description:
          active?.nextAction ??
          (hasDispatchFms
            ? "FMS tracks Pack → Load → Dispatch → Confirm delays and owners."
            : "Open the sales order to run dispatch for this order."),
        primaryLabel: hasDispatchFms ? "Open dispatch FMS" : "Open sales order",
        href:
          active?.href ??
          (salesOrderId
            ? `/app/sales-orders/${salesOrderId}`
            : SALES_OPS_DISPATCH_QUEUE_PATH),
      };
    }

    return {
      phase: "sales_orders",
      phaseLabel: "Fulfillment",
      title: active?.label ?? "Fulfillment in progress",
      description:
        active?.nextAction ??
        "Continue IMS stock check, purchase order, and dispatch.",
      primaryLabel: "Open sales order",
      href: salesOrderId ? `/app/sales-orders/${salesOrderId}` : "/app/sales-orders",
    };
  }

  if (mode === "pre_sales") {
    const key = active?.key ?? "quote";

    if (key === "quote") {
      return {
        phase: "leads",
        phaseLabel: "Pre-sales",
        title: active?.statusLabel === "Not started" ? "Create quotation" : "Send quotation",
        description:
          active?.nextAction ??
          "Prepare pricing and send the quotation to the customer.",
        primaryLabel: "Open Quotation",
        leadTab: "quote",
      };
    }

    if (key === "advance") {
      return {
        phase: "leads",
        phaseLabel: "Pre-sales",
        title: "Record advance payment",
        description:
          active?.nextAction ??
          "Advance payment locks the quote and auto-creates the sales order.",
        primaryLabel: "Open Payments",
        leadTab: "payments",
      };
    }

    return {
      phase: "leads",
      phaseLabel: "Pre-sales",
      title: salesOrderId
        ? "Sales order created"
        : active?.statusLabel === "Creating"
          ? "Creating sales order"
          : "Waiting for advance",
      description:
        active?.nextAction ??
        (salesOrderId
          ? "Track fulfillment from Sales Orders."
          : "Complete quotation and advance payment to create the sales order."),
      primaryLabel: salesOrderId ? "Open Sales Order" : "Open Payments",
      leadTab: salesOrderId ? undefined : "payments",
      href: salesOrderId ? `/app/sales-orders/${salesOrderId}` : undefined,
    };
  }

  const key = active?.key ?? "stock";

  if (key === "delivered" && active?.state === "done") {
    return {
      phase: "sales_orders",
      phaseLabel: "Fulfillment",
      title: "Delivered",
      description: "Order fulfillment is complete.",
      primaryLabel: "View sales order",
      href: salesOrderId ? `/app/sales-orders/${salesOrderId}` : "/app/sales-orders",
    };
  }

  if (key === "delivered") {
    return {
      phase: "sales_orders",
      phaseLabel: "Fulfillment",
      title: "Awaiting delivery confirmation",
      description: "Complete dispatch FMS through customer confirmation.",
      primaryLabel: "Open Sales Order",
      href: salesOrderId ? `/app/sales-orders/${salesOrderId}` : "/app/sales-orders",
    };
  }

  if (key === "stock") {
    return {
      phase: "sales_orders",
      phaseLabel: "Fulfillment",
      title: "Verify stock in IMS",
      description:
        active?.nextAction ??
        "Check IMS stock levels against the sales order, then mark ready or raise PO.",
      primaryLabel: "Open IMS",
      href: IMS_SALES_ORDER_STOCK_PATH,
    };
  }

  if (key === "po") {
    const hasPoFms = Boolean(active?.href?.includes("/app/fms/instances/"));
    return {
      phase: "sales_orders",
      phaseLabel: "Fulfillment",
      title: hasPoFms
        ? "Track purchase order process in FMS"
        : "Continue purchase order work",
      description:
        active?.nextAction ??
        (hasPoFms
          ? "FMS shows who owns the stop and any time delay through receive goods."
          : "Open the sales order to start Purchase Order FMS for this order."),
      primaryLabel: hasPoFms ? "Open PO FMS" : "Open sales order",
      href:
        active?.href ??
        (salesOrderId
          ? `/app/sales-orders/${salesOrderId}`
          : SALES_OPS_PO_QUEUE_PATH),
    };
  }

  if (key === "dispatch") {
    const hasDispatchFms = Boolean(active?.href?.includes("/app/fms/instances/"));
    return {
      phase: "sales_orders",
      phaseLabel: "Fulfillment",
      title: hasDispatchFms
        ? "Track dispatch process in FMS"
        : "Continue dispatch work",
      description:
        active?.nextAction ??
        (hasDispatchFms
          ? "FMS tracks Pack → Load → Dispatch → Confirm delays and owners."
          : "Open the sales order to run dispatch for this order."),
      primaryLabel: hasDispatchFms ? "Open dispatch FMS" : "Open sales order",
      href:
        active?.href ??
        (salesOrderId
          ? `/app/sales-orders/${salesOrderId}`
          : SALES_OPS_DISPATCH_QUEUE_PATH),
    };
  }

  return {
    phase: "sales_orders",
    phaseLabel: "Fulfillment",
    title: active?.label ?? "Fulfillment in progress",
    description:
      active?.nextAction ??
      "Continue IMS stock check, then Purchase Order and Dispatch FMS for process delays.",
    primaryLabel: "Open sales order",
    href: salesOrderId ? `/app/sales-orders/${salesOrderId}` : "/app/sales-orders",
  };
}

export function getDeliveryStepDetail(step?: DeliveryJourneyStep) {
  if (!step?.detail || isGenericStepDetail(step.detail)) {
    return undefined;
  }
  return step.detail;
}
