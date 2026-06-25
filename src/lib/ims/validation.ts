import { prisma } from "@/lib/db";

export function validateImsItemInput(data: {
  code: string;
  name: string;
  minQty: number;
  reorderQty: number;
  maxQty: number;
  unitCost: number;
}) {
  const code = data.code.trim();
  const name = data.name.trim();

  if (!code) {
    throw new Error("Item code is required.");
  }
  if (!name) {
    throw new Error("Item name is required.");
  }
  if (data.unitCost < 0) {
    throw new Error("Unit cost cannot be negative.");
  }
  if (data.minQty < 0 || data.reorderQty < 0 || data.maxQty < 0) {
    throw new Error("Min, reorder, and max quantities cannot be negative.");
  }
  if (data.reorderQty > 0 && data.reorderQty < data.minQty) {
    throw new Error("Reorder quantity must be at least the minimum quantity.");
  }
  if (data.maxQty > 0 && data.maxQty < data.reorderQty) {
    throw new Error("Max quantity must be at least the reorder quantity.");
  }
}

export async function assertUniqueImsItemCode(
  organizationId: string,
  code: string,
  excludeItemId?: string,
) {
  const normalized = code.trim().toUpperCase();
  const existing = await prisma.imsItem.findFirst({
    where: {
      organizationId,
      code: normalized,
      ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error(`Item code "${normalized}" is already in use.`);
  }
}
