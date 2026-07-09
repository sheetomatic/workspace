import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Marks a lead as touched by the sales team (not sheet auto-sync). */
export async function markLeadModified(
  organizationId: string,
  leadId: string,
  client: DbClient = prisma,
) {
  await client.inboundLead.updateMany({
    where: { id: leadId, organizationId },
    data: { modifiedAt: new Date() },
  });
}

export function isLeadUntouched(modifiedAt: Date | null | undefined) {
  return modifiedAt == null;
}
