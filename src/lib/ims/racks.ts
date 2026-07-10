import { prisma } from "@/lib/db";

export async function listImsRackSections(organizationId: string) {
  return prisma.imsRackSection.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: { _count: { select: { items: true } } },
  });
}

export async function createImsRackSection(params: {
  organizationId: string;
  code: string;
  name: string;
  siteName?: string | null;
}) {
  const code = params.code.trim().toUpperCase();
  const name = params.name.trim();
  if (!code || !name) {
    throw new Error("Rack code and name are required.");
  }

  return prisma.imsRackSection.create({
    data: {
      organizationId: params.organizationId,
      code,
      name,
      siteName: params.siteName?.trim() || null,
    },
  });
}

export async function assignItemRackSection(params: {
  organizationId: string;
  itemId: string;
  rackSectionId: string | null;
}) {
  const item = await prisma.imsItem.findFirst({
    where: { id: params.itemId, organizationId: params.organizationId },
  });
  if (!item) {
    throw new Error("Item not found.");
  }

  if (params.rackSectionId) {
    const rack = await prisma.imsRackSection.findFirst({
      where: { id: params.rackSectionId, organizationId: params.organizationId },
    });
    if (!rack) {
      throw new Error("Rack section not found.");
    }
  }

  return prisma.imsItem.update({
    where: { id: item.id },
    data: { rackSectionId: params.rackSectionId },
  });
}
