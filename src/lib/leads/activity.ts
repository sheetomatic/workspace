import type { InboundLeadActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logInboundLeadActivity(params: {
  organizationId: string;
  leadId: string;
  type: InboundLeadActivityType;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
  createdByUserId?: string | null;
}) {
  await prisma.inboundLeadActivity.create({
    data: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      type: params.type,
      body: params.body?.trim() || null,
      metadata: params.metadata,
      createdByUserId: params.createdByUserId ?? null,
    },
  });
}
