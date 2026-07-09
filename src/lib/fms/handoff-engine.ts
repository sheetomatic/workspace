import "server-only";

import type { Prisma, SalesOrderFmsRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReferenceLabel, createFmsInstanceFromSubmission } from "@/lib/fms/instance-lifecycle";
import { ensureFmsPresetProvisioned } from "@/lib/fms/provision-preset";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import {
  sendDispatchSlipNotifications,
} from "@/lib/sales-orders/dispatch-slip";

const PRESET_BY_ROLE: Record<SalesOrderFmsRole, string> = {
  SALES_ORDER: "sales-order",
  STOCK_CHECK: "stock-check-fulfillment",
  PURCHASE_ORDER: "purchase-order",
  DISPATCH: "dispatch-to-delivery",
};

function completionDecision(values: Record<string, unknown>) {
  const raw =
    values.fulfillment_decision ??
    values.decision ??
    values.fulfillment_status ??
    values.status;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function isReadyForDispatch(values: Record<string, unknown>) {
  const decision = completionDecision(values);
  return (
    decision === "ready_for_dispatch" ||
    decision.includes("ready") ||
    values.ready_for_dispatch === true
  );
}

function isShortageDecision(values: Record<string, unknown>) {
  const decision = completionDecision(values);
  return (
    decision === "shortage" ||
    decision === "purchase_required" ||
    decision === "po_required" ||
    Boolean(values.shortage_items ?? values.shortage_snapshot)
  );
}

async function getSalesOrderLink(instanceId: string, organizationId: string) {
  return prisma.salesOrderFmsLink.findFirst({
    where: { fmsInstanceId: instanceId, organizationId },
    include: {
      salesOrder: {
        include: {
          lead: true,
          quotation: true,
        },
      },
    },
  });
}

async function notifyStoreForStockCheck(
  organizationId: string,
  salesOrder: { id: string; orderNumber: string; leadId: string },
  actorUserId: string,
  message: string,
) {
  await logInboundLeadActivity({
    organizationId,
    leadId: salesOrder.leadId,
    type: "STATUS_CHANGE",
    body: message,
    createdByUserId: actorUserId,
    metadata: { salesOrderId: salesOrder.id, stockCheckRequired: true },
  });
}

export async function spawnFmsForSalesOrder(params: {
  salesOrderId: string;
  organizationId: string;
  role: SalesOrderFmsRole;
  submitterUserId: string;
  values: Record<string, unknown>;
}) {
  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id: params.salesOrderId, organizationId: params.organizationId },
  });

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  const presetId = PRESET_BY_ROLE[params.role];
  const template = await ensureFmsPresetProvisioned(
    params.organizationId,
    presetId,
    params.submitterUserId,
  );

  const fields = await prisma.fmsFormField.findMany({
    where: { formId: template.formId },
    orderBy: { sortOrder: "asc" },
    select: { fieldKey: true, label: true },
  });

  const submission = await prisma.fmsFormSubmission.create({
    data: {
      organizationId: params.organizationId,
      formId: template.formId,
      submittedById: params.submitterUserId,
      values: params.values as Prisma.InputJsonValue,
    },
  });

  const referenceLabel =
    (typeof params.values.sales_order_number === "string" &&
      params.values.sales_order_number.trim()) ||
    buildReferenceLabel(params.values, fields) ||
    salesOrder.orderNumber;

  const instance = await createFmsInstanceFromSubmission({
    organizationId: params.organizationId,
    template,
    submissionId: submission.id,
    referenceLabel,
  });

  await prisma.fmsInstance.update({
    where: { id: instance.id },
    data: { salesOrderId: salesOrder.id },
  });

  await prisma.salesOrderFmsLink.create({
    data: {
      organizationId: params.organizationId,
      salesOrderId: salesOrder.id,
      fmsInstanceId: instance.id,
      role: params.role,
    },
  });

  return { instance, template };
}

export async function handleFmsStepCompletedWithValues(params: {
  instanceId: string;
  organizationId: string;
  completedByUserId: string;
  stepName: string;
  completionValues: Record<string, unknown>;
}) {
  const link = await getSalesOrderLink(params.instanceId, params.organizationId);
  if (!link) {
    return;
  }

  const { salesOrder, role } = link;

  if (
    role === "STOCK_CHECK" &&
    params.stepName.trim().toLowerCase() === "fulfillment decision"
  ) {
    if (isReadyForDispatch(params.completionValues)) {
      const lead = salesOrder.lead;
      await spawnFmsForSalesOrder({
        salesOrderId: salesOrder.id,
        organizationId: params.organizationId,
        role: "DISPATCH",
        submitterUserId: params.completedByUserId,
        values: {
          sales_order_number: salesOrder.orderNumber,
          customer_name: lead.name ?? "",
          delivery_address: [lead.address, lead.zipCode].filter(Boolean).join(", "),
        },
      });

      await prisma.salesOrder.update({
        where: { id: salesOrder.id },
        data: { status: "READY_TO_DISPATCH" },
      });

      await logInboundLeadActivity({
        organizationId: params.organizationId,
        leadId: salesOrder.leadId,
        type: "STATUS_CHANGE",
        body: `${salesOrder.orderNumber} ready for dispatch`,
        createdByUserId: params.completedByUserId,
        metadata: { salesOrderId: salesOrder.id },
      });
      return;
    }

    if (isShortageDecision(params.completionValues)) {
      const shortageSnapshot =
        params.completionValues.shortage_snapshot ??
        params.completionValues.shortage_items ??
        params.completionValues;

      await prisma.salesOrder.update({
        where: { id: salesOrder.id },
        data: {
          status: "PO_PENDING",
          shortageSnapshot: shortageSnapshot as Prisma.InputJsonValue,
        },
      });

      await logInboundLeadActivity({
        organizationId: params.organizationId,
        leadId: salesOrder.leadId,
        type: "STATUS_CHANGE",
        body: `${salesOrder.orderNumber} blocked — stock shortage, PO required`,
        createdByUserId: params.completedByUserId,
        metadata: { salesOrderId: salesOrder.id, shortage: true },
      });
    }
    return;
  }

  if (
    role === "DISPATCH" &&
    params.stepName.trim().toLowerCase() === "dispatch" &&
    salesOrder.status === "READY_TO_DISPATCH"
  ) {
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: "IN_TRANSIT" },
    });

    await logInboundLeadActivity({
      organizationId: params.organizationId,
      leadId: salesOrder.leadId,
      type: "STATUS_CHANGE",
      body: `${salesOrder.orderNumber} dispatched — in transit`,
      createdByUserId: params.completedByUserId,
      metadata: { salesOrderId: salesOrder.id },
    });
  }
}

export async function handleFmsInstanceCompleted(
  instanceId: string,
  organizationId: string,
  completedByUserId: string,
) {
  const link = await getSalesOrderLink(instanceId, organizationId);
  if (!link) {
    return;
  }

  const { salesOrder, role } = link;

  if (role === "SALES_ORDER") {
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: "CONFIRMED" },
    });

    await notifyStoreForStockCheck(
      organizationId,
      salesOrder,
      completedByUserId,
      `${salesOrder.orderNumber} confirmed — start stock check from Sales Orders`,
    );
    return;
  }

  if (role === "PURCHASE_ORDER") {
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: "STOCK_CHECK" },
    });

    await notifyStoreForStockCheck(
      organizationId,
      salesOrder,
      completedByUserId,
      `Goods received for PO linked to ${salesOrder.orderNumber} — re-run stock check`,
    );
    return;
  }

  if (role === "DISPATCH") {
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: "DELIVERED" },
    });

    await sendDispatchSlipNotifications({
      organizationId,
      salesOrderId: salesOrder.id,
      actorUserId: completedByUserId,
    });

    await logInboundLeadActivity({
      organizationId,
      leadId: salesOrder.leadId,
      type: "STATUS_CHANGE",
      body: `${salesOrder.orderNumber} delivered`,
      createdByUserId: completedByUserId,
      metadata: { salesOrderId: salesOrder.id, delivered: true },
    });
  }
}
