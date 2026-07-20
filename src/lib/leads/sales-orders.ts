import "server-only";

import type {
  SalesOrderFmsRole as PrismaFmsRole,
  SalesOrderStatus as PrismaSalesOrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  DispatchSlipData,
  LeadSalesOrderData,
  SalesOrderFmsRole,
  SalesOrderListItem,
  SalesOrderStatus,
} from "@/lib/leads/sales-order-types";
import {
  getSalesOrderByDispatchToken,
  getSalesOrderDetail,
  getSalesOrderForLead,
  listSalesOrdersForOrg,
} from "@/lib/sales-orders/queries";
import { IMS_STOCK_FULFILLMENT_STATUSES } from "@/lib/ims/sales-order-stock";
import { buildDispatchPublicUrl } from "@/lib/leads/dispatch-public-url";
import { summarizeFmsInstance } from "@/lib/sales-orders/fms-process-summary";

export { buildDispatchPublicUrl };

export type ListSalesOrdersFilter = {
  status?: SalesOrderStatus | "ALL";
  pipeline?: "stock_fulfillment";
  q?: string;
  limit?: number;
  skip?: number;
};

type FmsLinkRow = {
  id: string;
  role: PrismaFmsRole;
  fmsInstance: {
    id: string;
    status: string;
    referenceLabel: string | null;
    template: { name: string };
    stepStates: Array<{
      status: string;
      plannedAt: Date | null;
      actualAt: Date | null;
      delayMinutes: number | null;
      owner: { name: string | null; email: string } | null;
      step: { stepName: string };
    }>;
  };
};

type OrderRow = NonNullable<Awaited<ReturnType<typeof getSalesOrderDetail>>>;

const UI_TO_PRISMA_STATUS: Partial<Record<SalesOrderStatus, PrismaSalesOrderStatus[]>> = {
  DRAFT: ["DRAFT"],
  CONFIRMED: ["CONFIRMED"],
  ADVANCE_PENDING: ["CONFIRMED"],
  STOCK_CHECK: ["STOCK_CHECK"],
  PO_PENDING: ["PO_PENDING"],
  PO_IN_PROGRESS: ["PO_PENDING"],
  DISPATCH_PENDING: ["READY_TO_DISPATCH"],
  DISPATCHED: ["IN_TRANSIT"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
};

function mapFmsRole(role: PrismaFmsRole): SalesOrderFmsRole {
  if (role === "PURCHASE_ORDER") {
    return "PO";
  }
  if (role === "STOCK_CHECK" || role === "DISPATCH") {
    return role;
  }
  return "OTHER";
}

function mapPrismaStatusToUi(
  status: PrismaSalesOrderStatus,
  links: FmsLinkRow[],
): SalesOrderStatus {
  const poLink = links.find((link) => link.role === "PURCHASE_ORDER");
  if (status === "PO_PENDING" && poLink?.fmsInstance.status === "ACTIVE") {
    return "PO_IN_PROGRESS";
  }

  const dispatchLink = links.find((link) => link.role === "DISPATCH");
  if (dispatchLink?.fmsInstance.status === "ACTIVE" && status === "READY_TO_DISPATCH") {
    return "DISPATCH_PENDING";
  }

  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "CONFIRMED":
      return links.some((link) => link.role === "STOCK_CHECK")
        ? "STOCK_CHECK"
        : "CONFIRMED";
    case "STOCK_CHECK":
      return "STOCK_CHECK";
    case "PO_PENDING":
      return "PO_PENDING";
    case "READY_TO_DISPATCH":
      return "DISPATCH_PENDING";
    case "IN_TRANSIT":
      return "DISPATCHED";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

function findFmsInstanceId(links: FmsLinkRow[], role: PrismaFmsRole) {
  return links.find((link) => link.role === role)?.fmsInstance.id ?? null;
}

function toLeadSalesOrderData(order: OrderRow): LeadSalesOrderData {
  const links = order.fmsLinks as FmsLinkRow[];
  const total = Number(order.quotation.totalAmount);
  const advance = Number(order.quotation.advanceRequired ?? 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: mapPrismaStatusToUi(order.status, links),
    orderValue: total,
    advanceAmount: advance,
    balanceAmount: Math.max(0, total - advance),
    quotationId: order.quotation.id,
    quotationNumber: order.quotation.quotationNumber,
    dispatchShareToken: order.dispatchShareToken,
    stockCheckFmsInstanceId: findFmsInstanceId(links, "STOCK_CHECK"),
    poFmsInstanceId: findFmsInstanceId(links, "PURCHASE_ORDER"),
    dispatchFmsInstanceId: findFmsInstanceId(links, "DISPATCH"),
    fmsInstances: links.map((link) =>
      summarizeFmsInstance(
        link.fmsInstance.id,
        link.fmsInstance.template.name,
        link.fmsInstance.referenceLabel ?? order.orderNumber,
        link.fmsInstance.status,
        mapFmsRole(link.role),
        link.fmsInstance.stepStates,
      ),
    ),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function toSalesOrderListItem(order: OrderRow): SalesOrderListItem {
  return {
    ...toLeadSalesOrderData(order),
    lead: {
      id: order.lead.id,
      name: order.lead.name,
      phone: order.lead.phone,
      company: order.lead.company,
    },
  };
}

export async function getSalesOrderByLeadId(
  organizationId: string,
  leadId: string,
): Promise<LeadSalesOrderData | null> {
  const order = await getSalesOrderForLead(organizationId, leadId);
  return order ? toLeadSalesOrderData(order) : null;
}

/** Batch lookup — latest SO per lead (list badges). */
export async function getSalesOrdersByLeadIds(
  organizationId: string,
  leadIds: string[],
): Promise<Map<string, LeadSalesOrderData>> {
  const all = await getAllSalesOrdersByLeadIds(organizationId, leadIds);
  const map = new Map<string, LeadSalesOrderData>();
  for (const [leadId, orders] of all) {
    if (orders[0]) {
      map.set(leadId, orders[0]);
    }
  }
  return map;
}

/** Light include for CRM list badges — no FMS stepStates (drawer detail uses single-lead fetch). */
const salesOrderListLightInclude = {
  quotation: {
    select: {
      id: true,
      quotationNumber: true,
      totalAmount: true,
      advanceRequired: true,
    },
  },
  fmsLinks: {
    select: {
      role: true,
      fmsInstance: {
        select: {
          id: true,
          status: true,
          referenceLabel: true,
          template: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

type LightOrderRow = {
  id: string;
  leadId: string;
  orderNumber: string;
  status: PrismaSalesOrderStatus;
  dispatchShareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  quotation: {
    id: string;
    quotationNumber: string;
    totalAmount: unknown;
    advanceRequired: unknown;
  };
  fmsLinks: Array<{
    role: PrismaFmsRole;
    fmsInstance: {
      id: string;
      status: string;
      referenceLabel: string | null;
      template: { name: string };
    };
  }>;
};

function mapLightPrismaStatusToUi(
  status: PrismaSalesOrderStatus,
  links: LightOrderRow["fmsLinks"],
): SalesOrderStatus {
  const poLink = links.find((link) => link.role === "PURCHASE_ORDER");
  if (status === "PO_PENDING" && poLink?.fmsInstance.status === "ACTIVE") {
    return "PO_IN_PROGRESS";
  }

  const dispatchLink = links.find((link) => link.role === "DISPATCH");
  if (dispatchLink?.fmsInstance.status === "ACTIVE" && status === "READY_TO_DISPATCH") {
    return "DISPATCH_PENDING";
  }

  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "CONFIRMED":
      return links.some((link) => link.role === "STOCK_CHECK")
        ? "STOCK_CHECK"
        : "CONFIRMED";
    case "STOCK_CHECK":
      return "STOCK_CHECK";
    case "PO_PENDING":
      return "PO_PENDING";
    case "READY_TO_DISPATCH":
      return "DISPATCH_PENDING";
    case "IN_TRANSIT":
      return "DISPATCHED";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

function findLightFmsInstanceId(
  links: LightOrderRow["fmsLinks"],
  role: PrismaFmsRole,
) {
  return links.find((link) => link.role === role)?.fmsInstance.id ?? null;
}

function toLightLeadSalesOrderData(order: LightOrderRow): LeadSalesOrderData {
  const links = order.fmsLinks;
  const total = Number(order.quotation.totalAmount);
  const advance = Number(order.quotation.advanceRequired ?? 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: mapLightPrismaStatusToUi(order.status, links),
    orderValue: total,
    advanceAmount: advance,
    balanceAmount: Math.max(0, total - advance),
    quotationId: order.quotation.id,
    quotationNumber: order.quotation.quotationNumber,
    dispatchShareToken: order.dispatchShareToken,
    stockCheckFmsInstanceId: findLightFmsInstanceId(links, "STOCK_CHECK"),
    poFmsInstanceId: findLightFmsInstanceId(links, "PURCHASE_ORDER"),
    dispatchFmsInstanceId: findLightFmsInstanceId(links, "DISPATCH"),
    fmsInstances: links.map((link) =>
      summarizeFmsInstance(
        link.fmsInstance.id,
        link.fmsInstance.template.name,
        link.fmsInstance.referenceLabel ?? order.orderNumber,
        link.fmsInstance.status,
        mapFmsRole(link.role),
        [],
      ),
    ),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/** All SOs per lead — one batched query (newest first). No per-lead N+1. */
export async function getAllSalesOrdersByLeadIds(
  organizationId: string,
  leadIds: string[],
): Promise<Map<string, LeadSalesOrderData[]>> {
  const unique = [...new Set(leadIds.filter(Boolean))];
  const map = new Map<string, LeadSalesOrderData[]>();
  if (unique.length === 0) {
    return map;
  }

  for (const leadId of unique) {
    map.set(leadId, []);
  }

  const orders = (await prisma.salesOrder.findMany({
    where: { organizationId, leadId: { in: unique } },
    orderBy: { createdAt: "desc" },
    include: salesOrderListLightInclude,
  })) as LightOrderRow[];

  for (const order of orders) {
    const list = map.get(order.leadId);
    if (list) {
      list.push(toLightLeadSalesOrderData(order));
    } else {
      map.set(order.leadId, [toLightLeadSalesOrderData(order)]);
    }
  }
  return map;
}


export async function getSalesOrderById(
  organizationId: string,
  orderId: string,
): Promise<SalesOrderListItem | null> {
  const order = await getSalesOrderDetail(organizationId, orderId);
  return order ? toSalesOrderListItem(order) : null;
}

export async function listSalesOrders(
  organizationId: string,
  filter: ListSalesOrdersFilter = {},
): Promise<{ orders: SalesOrderListItem[]; total: number }> {
  const prismaStatuses =
    filter.status && filter.status !== "ALL"
      ? UI_TO_PRISMA_STATUS[filter.status]
      : undefined;

  const orders = await listSalesOrdersForOrg(organizationId, {
    limit: filter.limit ?? 100,
  });

  const detailed = await Promise.all(
    orders.map((order) => getSalesOrderDetail(organizationId, order.id)),
  );

  let mapped = detailed
    .filter((order): order is OrderRow => order != null)
    .map(toSalesOrderListItem);

  if (filter.pipeline === "stock_fulfillment") {
    mapped = mapped.filter((order) =>
      IMS_STOCK_FULFILLMENT_STATUSES.includes(
        order.status as (typeof IMS_STOCK_FULFILLMENT_STATUSES)[number],
      ),
    );
  } else if (prismaStatuses?.length) {
    mapped = mapped.filter((order) => {
      if (filter.status === "PO_PENDING") {
        return order.status === "PO_PENDING" || order.status === "PO_IN_PROGRESS";
      }
      if (filter.status === "PO_IN_PROGRESS") {
        return order.status === "PO_IN_PROGRESS";
      }
      if (filter.status === "STOCK_CHECK") {
        return order.status === "STOCK_CHECK";
      }
      if (filter.status === "DISPATCH_PENDING") {
        return order.status === "DISPATCH_PENDING" || order.status === "DISPATCHED";
      }
      return prismaStatuses.includes(
        orders.find((row) => row.id === order.id)?.status as PrismaSalesOrderStatus,
      );
    });
  }

  const q = filter.q?.trim().toLowerCase();
  if (q) {
    mapped = mapped.filter((order) => {
      const haystack = [
        order.orderNumber,
        order.lead.name,
        order.lead.company,
        order.lead.phone,
        order.quotationNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return { orders: mapped, total: mapped.length };
}

export async function getDispatchSlipByShareToken(
  shareToken: string,
): Promise<DispatchSlipData | null> {
  const order = await getSalesOrderByDispatchToken(shareToken);
  if (!order) {
    return null;
  }

  const lineItems = Array.isArray(order.lineItems)
    ? (order.lineItems as Array<Record<string, unknown>>)
    : [];

  return {
    slipNumber: order.orderNumber,
    orderNumber: order.orderNumber,
    dispatchDate: new Date().toISOString().slice(0, 10),
    customerName: order.lead.name ?? "Customer",
    customerCompany: null,
    customerAddress: [order.lead.address].filter(Boolean).join(", ") || null,
    customerPhone: order.lead.phone,
    transportMode: null,
    lrNumber: null,
    boxes: null,
    weightKg: null,
    notes: order.quotation.paymentTerms,
    lines: lineItems.map((line) => ({
      description: String(line.item_name ?? line.description ?? "Item"),
      quantity: Number(line.quantity ?? 1),
      unit: null,
    })),
    organization: {
      name: order.organization.name,
      logoUrl: order.organization.logoUrl,
    },
  };
}
