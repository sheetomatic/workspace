import { prisma } from "@/lib/db";

export type StoreWorkflowCounts = {
  mrPending: number;
  mrDraft: number;
  indentPending: number;
  purchaseBillsDraft: number;
  movementsLast7Days: number;
  physicalCountsDraft: number;
  gatePassesDraft: number;
  wastageLast7Days: number;
  rackSections: number;
  vendorCount: number;
};

export async function getStoreWorkflowCounts(
  organizationId: string,
): Promise<StoreWorkflowCounts> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    mrPending,
    mrDraft,
    indentPending,
    purchaseBillsDraft,
    movementsLast7Days,
    physicalCountsDraft,
    gatePassesDraft,
    wastageLast7Days,
    rackSections,
    vendorCount,
  ] = await Promise.all([
    prisma.imsMaterialRequisition.count({
      where: { organizationId, status: "PENDING" },
    }),
    prisma.imsMaterialRequisition.count({
      where: { organizationId, status: "DRAFT" },
    }),
    prisma.imsIndent.count({
      where: { organizationId, status: "PENDING" },
    }),
    prisma.imsPurchaseBill.count({
      where: { organizationId, status: "DRAFT" },
    }),
    prisma.imsStockMovement.count({
      where: { organizationId, createdAt: { gte: weekAgo } },
    }),
    prisma.imsPhysicalStockCount.count({
      where: { organizationId, status: "DRAFT" },
    }),
    prisma.imsGatePass.count({
      where: { organizationId, status: "DRAFT" },
    }),
    prisma.imsStockMovement.count({
      where: {
        organizationId,
        movementType: "WASTAGE",
        createdAt: { gte: weekAgo },
      },
    }),
    prisma.imsRackSection.count({
      where: { organizationId, isActive: true },
    }),
    prisma.imsVendor.count({
      where: { organizationId, isActive: true },
    }),
  ]);

  return {
    mrPending,
    mrDraft,
    indentPending,
    purchaseBillsDraft,
    movementsLast7Days,
    physicalCountsDraft,
    gatePassesDraft,
    wastageLast7Days,
    rackSections,
    vendorCount,
  };
}
