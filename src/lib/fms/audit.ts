import type { FmsAuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function recordFmsAudit(params: {
  organizationId: string;
  userId: string;
  action: FmsAuditAction;
  summary: string;
  instanceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.fmsAuditEvent.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        summary: params.summary.slice(0, 500),
        instanceId: params.instanceId ?? null,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("recordFmsAudit", error);
  }
}

export async function listFmsAuditForInstance(
  instanceId: string,
  organizationId: string,
  limit = 30,
) {
  try {
    return await prisma.fmsAuditEvent.findMany({
      where: { instanceId, organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("listFmsAuditForInstance", error);
    return [];
  }
}

export async function listRecentFmsAudit(organizationId: string, limit = 20) {
  try {
    return await prisma.fmsAuditEvent.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("listRecentFmsAudit", error);
    return [];
  }
}

export const FMS_AUDIT_LABELS: Record<FmsAuditAction, string> = {
  FORM_SUBMITTED: "Form submitted",
  STEP_COMPLETED: "Step completed",
  STEP_SKIPPED: "Step skipped",
  STEP_REASSIGNED: "Step reassigned",
  INSTANCE_CANCELLED: "Job cancelled",
  DESIGN_APPROVED: "Design approved",
  DESIGN_REJECTED: "Design rejected",
  DESIGN_SUBMITTED: "Design submitted",
};
