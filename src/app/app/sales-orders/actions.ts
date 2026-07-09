"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { spawnFmsForSalesOrder } from "@/lib/fms/handoff-engine";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import {
  sendDispatchSlipEmail,
  sendDispatchSlipWhatsApp,
} from "@/lib/sales-orders/dispatch-slip";
import { getSalesOrderDetail } from "@/lib/sales-orders/queries";

async function requireSalesOrderManager() {
  const user = await requireSession("MANAGER", { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    throw new Error("Not allowed.");
  }
  return user;
}

function revalidateSalesOrderPaths(orderId?: string) {
  revalidatePath("/app/sales-orders");
  revalidatePath("/app/leads");
  if (orderId) {
    revalidatePath(`/app/sales-orders/${orderId}`);
  }
}

export async function startStockCheckFmsAction(salesOrderId: string) {
  return startSalesOrderStockCheck(salesOrderId);
}

export async function startPurchaseOrderFmsAction(salesOrderId: string) {
  return startSalesOrderPo(salesOrderId);
}

export async function startSalesOrderStockCheck(salesOrderId: string) {
  try {
    const user = await requireSalesOrderManager();
    const order = await getSalesOrderDetail(user.organizationId, salesOrderId);
    if (!order) {
      return { ok: false as const, message: "Sales order not found." };
    }

    const hasStockCheck = order.fmsLinks.some(
      (link) =>
        link.role === "STOCK_CHECK" && link.fmsInstance.status === "ACTIVE",
    );
    if (hasStockCheck) {
      return { ok: false as const, message: "Stock check is already in progress." };
    }

    if (!["CONFIRMED", "STOCK_CHECK", "PO_PENDING"].includes(order.status)) {
      return {
        ok: false as const,
        message: "Sales order is not ready for stock check yet.",
      };
    }

    const deliveryDate =
      order.quotation.endDate ??
      order.quotation.projectStartDate ??
      new Date();

    await spawnFmsForSalesOrder({
      salesOrderId: order.id,
      organizationId: user.organizationId,
      role: "STOCK_CHECK",
      submitterUserId: user.id,
      values: {
        sales_order_number: order.orderNumber,
        delivery_date: deliveryDate.toISOString().slice(0, 10),
      },
    });

    await prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: "STOCK_CHECK" },
    });

    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId: order.leadId,
      type: "STATUS_CHANGE",
      body: `Stock check started for ${order.orderNumber}`,
      createdByUserId: user.id,
      metadata: { salesOrderId: order.id },
    });

    revalidateSalesOrderPaths(order.id);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not start stock check.",
    };
  }
}

export async function startSalesOrderPo(salesOrderId: string) {
  try {
    const user = await requireSalesOrderManager();
    const order = await getSalesOrderDetail(user.organizationId, salesOrderId);
    if (!order) {
      return { ok: false as const, message: "Sales order not found." };
    }

    if (order.status !== "PO_PENDING") {
      return { ok: false as const, message: "Purchase order is not required for this order." };
    }

    const hasPo = order.fmsLinks.some((link) => link.role === "PURCHASE_ORDER");
    if (hasPo) {
      return { ok: false as const, message: "Purchase order is already in progress." };
    }

    const shortageItems = Array.isArray(order.shortageSnapshot)
      ? order.shortageSnapshot
      : order.shortageSnapshot &&
          typeof order.shortageSnapshot === "object" &&
          Array.isArray((order.shortageSnapshot as { items?: unknown }).items)
        ? (order.shortageSnapshot as { items: unknown[] }).items
        : [];

    const deliveryDate =
      order.quotation.endDate ??
      order.quotation.projectStartDate ??
      new Date();

    await spawnFmsForSalesOrder({
      salesOrderId: order.id,
      organizationId: user.organizationId,
      role: "PURCHASE_ORDER",
      submitterUserId: user.id,
      values: {
        sales_order_number: order.orderNumber,
        vendor_name: "",
        expected_delivery_date: deliveryDate.toISOString().slice(0, 10),
        line_items: shortageItems,
      },
    });

    await logInboundLeadActivity({
      organizationId: user.organizationId,
      leadId: order.leadId,
      type: "STATUS_CHANGE",
      body: `Purchase order started for ${order.orderNumber}`,
      createdByUserId: user.id,
      metadata: { salesOrderId: order.id },
    });

    revalidateSalesOrderPaths(order.id);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not start purchase order.",
    };
  }
}

export async function sendDispatchSlipWhatsAppAction(salesOrderId: string) {
  try {
    const user = await requireSalesOrderManager();
    const result = await sendDispatchSlipWhatsApp(
      user.organizationId,
      salesOrderId,
      user.id,
    );
    revalidateSalesOrderPaths(salesOrderId);
    return result;
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not send WhatsApp.",
    };
  }
}

export async function sendDispatchSlipEmailAction(salesOrderId: string) {
  try {
    const user = await requireSalesOrderManager();
    const result = await sendDispatchSlipEmail(
      user.organizationId,
      salesOrderId,
      user.id,
    );
    revalidateSalesOrderPaths(salesOrderId);
    return result;
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not send email.",
    };
  }
}

export async function createSalesOrderFromLead(leadId: string) {
  const user = await requireSalesOrderManager();
  void leadId;
  void user;
  revalidateSalesOrderPaths();
  return { ok: true as const };
}
