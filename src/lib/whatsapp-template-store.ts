import type { WhatsAppTemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function listOrganizationWhatsAppTemplates(
  organizationId: string,
  status?: WhatsAppTemplateStatus | "ALL",
) {
  return prisma.whatsAppTemplate.findMany({
    where: {
      organizationId,
      ...(status && status !== "ALL" ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
  });
}
