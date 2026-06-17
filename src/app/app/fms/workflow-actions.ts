"use server";

import { revalidatePath } from "next/cache";
import {
  cancelFmsInstance,
  reassignFmsStepOwner,
  skipFmsStep,
} from "@/lib/fms/instance-lifecycle";
import { canControlFmsPipeline, canManageFms } from "@/lib/fms/access";
import { getFmsActor } from "@/lib/fms/session";
import { recordFmsAudit } from "@/lib/fms/audit";
import { prisma } from "@/lib/db";
import type { FmsActionState } from "@/lib/fms-action-state";

function revalidateInstance(instanceId: string) {
  revalidatePath(`/app/fms/instances/${instanceId}`);
  revalidatePath("/app/fms/lines");
  revalidatePath("/app/fms/my-stops");
}

export async function skipFmsStepAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getFmsActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const { user } = actor;

    if (!canControlFmsPipeline(user.role)) {
      return { ok: false, message: "You cannot skip pipeline steps." };
    }

    const stepStateId = formData.get("stepStateId")?.toString() ?? "";
    const instanceId = formData.get("instanceId")?.toString() ?? "";
    const reason = formData.get("reason")?.toString() ?? "";

    const stepState = await prisma.fmsStepState.findFirst({
      where: {
        id: stepStateId,
        instance: { organizationId: user.organizationId },
      },
      include: { step: true },
    });

    await skipFmsStep({
      stepStateId,
      organizationId: user.organizationId,
      userId: user.id,
      reason,
    });

    if (stepState) {
      await recordFmsAudit({
        organizationId: user.organizationId,
        userId: user.id,
        action: "STEP_SKIPPED",
        instanceId: stepState.instanceId,
        summary: `Skipped "${stepState.step.stepName}"${reason ? `: ${reason}` : "."}`,
        metadata: { stepStateId, reason: reason || null },
      });
    }

    if (instanceId) {
      revalidateInstance(instanceId);
    } else {
      revalidatePath("/app/fms");
    }

    return { ok: true, message: "Step skipped. Pipeline moved forward." };
  } catch (error) {
    console.error("skipFmsStepAction", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not skip step.",
    };
  }
}

export async function cancelFmsInstanceAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getFmsActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const { user } = actor;

    if (!canControlFmsPipeline(user.role)) {
      return { ok: false, message: "You cannot cancel pipeline jobs." };
    }

    const instanceId = formData.get("instanceId")?.toString() ?? "";

    const instance = await prisma.fmsInstance.findFirst({
      where: { id: instanceId, organizationId: user.organizationId },
      select: { referenceLabel: true, template: { select: { name: true } } },
    });

    await cancelFmsInstance({
      instanceId,
      organizationId: user.organizationId,
    });

    await recordFmsAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "INSTANCE_CANCELLED",
      instanceId,
      summary: `Cancelled job "${instance?.referenceLabel ?? instance?.template.name ?? instanceId}".`,
    });

    revalidateInstance(instanceId);
    return { ok: true, message: "Job cancelled." };
  } catch (error) {
    console.error("cancelFmsInstanceAction", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not cancel job.",
    };
  }
}

export async function reassignFmsStepAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getFmsActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const { user } = actor;

    if (!canControlFmsPipeline(user.role) && !canManageFms(user.role)) {
      return { ok: false, message: "You cannot reassign step owners." };
    }

    const stepStateId = formData.get("stepStateId")?.toString() ?? "";
    const newOwnerUserId = formData.get("newOwnerUserId")?.toString() ?? "";
    const instanceId = formData.get("instanceId")?.toString() ?? "";

    if (!newOwnerUserId) {
      return { ok: false, message: "Select a new owner." };
    }

    const stepState = await prisma.fmsStepState.findFirst({
      where: {
        id: stepStateId,
        instance: { organizationId: user.organizationId },
      },
      include: {
        step: true,
        owner: { select: { name: true, email: true } },
      },
    });

    const newOwnerMembership = await prisma.membership.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: newOwnerUserId,
      },
      include: { user: { select: { name: true, email: true } } },
    });
    const newOwner = newOwnerMembership?.user;

    await reassignFmsStepOwner({
      stepStateId,
      organizationId: user.organizationId,
      newOwnerUserId,
    });

    if (stepState) {
      const newLabel = newOwner?.name ?? newOwner?.email ?? "member";
      await recordFmsAudit({
        organizationId: user.organizationId,
        userId: user.id,
        action: "STEP_REASSIGNED",
        instanceId: stepState.instanceId,
        summary: `Reassigned "${stepState.step.stepName}" to ${newLabel}.`,
        metadata: {
          stepStateId,
          fromOwnerId: stepState.ownerUserId,
          toOwnerId: newOwnerUserId,
        },
      });
    }

    if (instanceId) {
      revalidateInstance(instanceId);
    } else {
      revalidatePath("/app/fms");
    }

    return { ok: true, message: "Step owner updated and notified." };
  } catch (error) {
    console.error("reassignFmsStepAction", error);
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not reassign step owner.",
    };
  }
}
