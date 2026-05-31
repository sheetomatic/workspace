"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";

export type ApprovalActionState = {
  ok: boolean;
  message: string;
};

export async function reviewApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNote?: string,
): Promise<ApprovalActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "You cannot review approvals." };
  }

  const approval = await prisma.workspaceApproval.findFirst({
    where: {
      id: approvalId,
      organizationId: user.organizationId,
      status: "PENDING",
    },
  });

  if (!approval) {
    return { ok: false, message: "Approval not found or already reviewed." };
  }

  if (!hasMinimumRole(user.role, approval.minRole)) {
    return { ok: false, message: "Your role cannot review this item." };
  }

  await prisma.workspaceApproval.updateMany({
    where: {
      id: approvalId,
      organizationId: user.organizationId,
      status: "PENDING",
    },
    data: {
      status: decision,
      reviewNote: reviewNote?.trim() || null,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/approvals");

  return {
    ok: true,
    message:
      decision === "APPROVED"
        ? "Approved and ready for MIS."
        : "Rejected with note saved.",
  };
}
