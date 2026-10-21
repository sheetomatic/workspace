import "server-only";

import type { FieldConveyanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fieldConveyanceScope } from "@/lib/hr/field-conveyance-rules";

export async function listFieldConveyanceClaims(
  organizationId: string,
  options: {
    claimantUserId?: string;
    statuses?: FieldConveyanceStatus[];
    limit?: number;
  } = {},
) {
  const rows = await prisma.fieldConveyanceClaim.findMany({
    where: {
      ...fieldConveyanceScope(organizationId, options.claimantUserId),
      ...(options.statuses ? { status: { in: options.statuses } } : {}),
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: options.limit ?? 100,
    include: {
      claimant: { select: { id: true, name: true, email: true } },
      visit: { select: { id: true, clientName: true, plannedAt: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      paidBy: { select: { id: true, name: true, email: true } },
      attachments: {
        select: {
          id: true,
          kind: true,
          submissionRound: true,
          fileName: true,
          size: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: [{ submissionRound: "desc" }, { createdAt: "desc" }],
      },
      auditEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true, email: true } } },
      },
    },
  });

  return rows.map((row) => ({
    ...row,
    claimedDistanceKm: Number(row.claimedDistanceKm),
    amount: Number(row.amount),
    attachments: row.attachments.map((attachment) => ({
      ...attachment,
      downloadUrl: `/api/hr/field/conveyance/attachments/${attachment.id}`,
    })),
  }));
}
