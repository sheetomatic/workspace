import { prisma } from "@/lib/db";
import { dispatchFmsStepReminder } from "@/lib/fms-reminders";
import { createFmsStepAssignedNotification } from "@/lib/fms/in-app-notifications";

export async function notifyFmsStepAssigned(stepStateId: string) {
  const stepState = await prisma.fmsStepState.findUnique({
    where: { id: stepStateId },
    include: {
      step: true,
      owner: { select: { name: true, email: true, phone: true } },
      instance: {
        include: {
          template: { select: { alertConfig: true, name: true } },
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (
    !stepState ||
    stepState.status !== "IN_PROGRESS" ||
    !stepState.ownerUserId ||
    !stepState.owner
  ) {
    return;
  }

  try {
    await createFmsStepAssignedNotification({
      userId: stepState.ownerUserId,
      organizationId: stepState.instance.organizationId,
      instanceId: stepState.instanceId,
      referenceLabel:
        stepState.instance.referenceLabel ?? stepState.instance.template.name,
      stepName: stepState.step.stepName,
    });
  } catch (error) {
    console.error("fms in-app notification", error);
  }

  if (stepState.whatsappAssignSentAt) {
    return;
  }

  const result = await dispatchFmsStepReminder({
    stepStateId: stepState.id,
    instanceId: stepState.instanceId,
    kind: "assign",
    referenceLabel:
      stepState.instance.referenceLabel ?? stepState.instance.template.name,
    stepName: stepState.step.stepName,
    plannedAt: stepState.plannedAt,
    assignee: stepState.owner,
    organizationName: stepState.instance.organization.name,
    organizationId: stepState.instance.organizationId,
    alertConfig: stepState.instance.template.alertConfig,
  });

  if (result.whatsappSent || result.emailSent) {
    await prisma.fmsStepState.update({
      where: { id: stepState.id },
      data: { whatsappAssignSentAt: new Date() },
    });
  }
}
