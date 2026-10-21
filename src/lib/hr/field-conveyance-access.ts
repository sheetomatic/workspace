import "server-only";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getEffectiveHrSubModulesForUser } from "@/lib/hr/hr-access";
import {
  canProcessFieldConveyancePayment,
  canReviewFieldConveyance,
  type FieldConveyanceActor,
} from "@/lib/hr/field-conveyance-rules";

export async function getFieldConveyanceActor(user: SessionUser) {
  if (!hasWorkspaceModule(user, "HR")) return null;
  const { allowed } = await getEffectiveHrSubModulesForUser(user);
  if (!allowed("field")) return null;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    select: { department: true, deactivatedAt: true },
  });
  if (!membership && !user.isSuperAdmin) return null;
  if (membership?.deactivatedAt) return null;

  return {
    userId: user.id,
    role: user.role,
    department: membership?.department ?? null,
  } satisfies FieldConveyanceActor;
}

export function fieldCanReview(
  actor: FieldConveyanceActor,
  claim: { claimantUserId: string; status: "PENDING" | "APPROVED" | "REJECTED" | "PAID" },
) {
  return canReviewFieldConveyance(actor, {
    ...claim,
    reviewedByUserId: null,
  });
}

export function fieldCanPay(
  actor: FieldConveyanceActor,
  claim: {
    claimantUserId: string;
    reviewedByUserId: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  },
) {
  return canProcessFieldConveyancePayment(actor, claim);
}
