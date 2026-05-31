import type { AiKnowledgeType } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function listOrganizationKnowledgeItems(
  organizationId: string,
  type?: AiKnowledgeType | "ALL",
) {
  return prisma.aiKnowledgeItem.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      ...(type && type !== "ALL" ? { type } : {}),
    },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
}

export async function countActiveKnowledgeItems(organizationId: string) {
  return prisma.aiKnowledgeItem.count({
    where: { organizationId, status: "ACTIVE" },
  });
}

export async function getActiveKnowledgeContext(organizationId: string) {
  return prisma.aiKnowledgeItem.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      question: true,
      content: true,
      sourceUrl: true,
    },
    take: 40,
  });
}

export async function getKnowledgeMenuItems(organizationId: string) {
  return prisma.aiKnowledgeItem.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      question: true,
      content: true,
      sourceUrl: true,
    },
    take: 20,
  });
}

export async function getKnowledgeItemForOrg(
  organizationId: string,
  itemId: string,
) {
  return prisma.aiKnowledgeItem.findFirst({
    where: { id: itemId, organizationId, status: "ACTIVE" },
  });
}
