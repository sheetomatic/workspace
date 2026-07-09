import "server-only";

import { prisma } from "@/lib/db";

const salesOrderDetailInclude = {
  lead: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      company: true,
      address: true,
      zipCode: true,
    },
  },
  quotation: {
    select: {
      id: true,
      quotationNumber: true,
      totalAmount: true,
      advanceRequired: true,
      paymentTerms: true,
      projectStartDate: true,
      endDate: true,
      lockedAt: true,
    },
  },
  fmsLinks: {
    include: {
      fmsInstance: {
        select: {
          id: true,
          status: true,
          referenceLabel: true,
          template: { select: { name: true } },
          stepStates: {
            orderBy: { step: { sortOrder: "asc" as const } },
            select: {
              status: true,
              plannedAt: true,
              actualAt: true,
              delayMinutes: true,
              owner: { select: { name: true, email: true } },
              step: { select: { stepName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function getSalesOrderForLead(
  organizationId: string,
  leadId: string,
) {
  return prisma.salesOrder.findFirst({
    where: { organizationId, leadId },
    orderBy: { createdAt: "desc" },
    include: salesOrderDetailInclude,
  });
}

export async function getSalesOrderDetail(
  organizationId: string,
  salesOrderId: string,
) {
  return prisma.salesOrder.findFirst({
    where: { id: salesOrderId, organizationId },
    include: salesOrderDetailInclude,
  });
}

export async function listSalesOrdersForOrg(
  organizationId: string,
  options?: { status?: import("@prisma/client").SalesOrderStatus; limit?: number },
) {
  return prisma.salesOrder.findMany({
    where: {
      organizationId,
      ...(options?.status ? { status: options.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      quotation: { select: { quotationNumber: true, totalAmount: true } },
    },
  });
}

export async function listDelayedDispatchSalesOrders(organizationId: string) {
  const now = new Date();
  return prisma.salesOrder.findMany({
    where: {
      organizationId,
      status: { in: ["READY_TO_DISPATCH", "IN_TRANSIT"] },
      quotation: {
        OR: [
          { endDate: { lt: now } },
          { projectStartDate: { lt: now } },
        ],
      },
    },
    orderBy: { updatedAt: "asc" },
    take: 20,
    include: {
      lead: { select: { id: true, name: true } },
      quotation: { select: { endDate: true, projectStartDate: true } },
    },
  });
}

export async function getSalesOrderStats(organizationId: string) {
  const [total, inProgress, delivered, poPending, readyToDispatch] =
    await Promise.all([
      prisma.salesOrder.count({ where: { organizationId } }),
      prisma.salesOrder.count({
        where: {
          organizationId,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
        },
      }),
      prisma.salesOrder.count({
        where: { organizationId, status: "DELIVERED" },
      }),
      prisma.salesOrder.count({
        where: { organizationId, status: "PO_PENDING" },
      }),
      prisma.salesOrder.count({
        where: {
          organizationId,
          status: { in: ["READY_TO_DISPATCH", "IN_TRANSIT"] },
        },
      }),
    ]);

  return { total, inProgress, delivered, poPending, readyToDispatch };
}

/** Lightweight stats for the workspace home widget grid. */
export async function getSalesOrderWidgetStats(organizationId: string) {
  const now = new Date();
  const openWhere = {
    organizationId,
    status: {
      notIn: ["DELIVERED", "CANCELLED"] as import("@prisma/client").SalesOrderStatus[],
    },
  };

  const [openOrders, delayedFmsCount] = await Promise.all([
    prisma.salesOrder.findMany({
      where: openWhere,
      select: { quotation: { select: { totalAmount: true } } },
      take: 500,
    }),
    prisma.salesOrder.count({
      where: {
        ...openWhere,
        fmsLinks: {
          some: {
            fmsInstance: {
              status: "ACTIVE",
              stepStates: {
                some: { status: "IN_PROGRESS", plannedAt: { lt: now } },
              },
            },
          },
        },
      },
    }),
  ]);

  const pipelineValue = openOrders.reduce(
    (sum, order) => sum + Number(order.quotation?.totalAmount ?? 0),
    0,
  );

  return { open: openOrders.length, pipelineValue, delayedFms: delayedFmsCount };
}

export async function getSalesOrderByDispatchToken(shareToken: string) {
  return prisma.salesOrder.findFirst({
    where: { dispatchShareToken: shareToken },
    include: {
      lead: {
        select: {
          name: true,
          phone: true,
          email: true,
          address: true,
        },
      },
      quotation: {
        select: {
          quotationNumber: true,
          totalAmount: true,
          paymentTerms: true,
        },
      },
      organization: { select: { name: true, logoUrl: true } },
    },
  });
}
