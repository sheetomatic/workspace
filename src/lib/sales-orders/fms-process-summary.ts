import type { SalesOrderFmsLink, SalesOrderFmsRole } from "@/lib/leads/sales-order-types";
import { formatDelayLabel, liveDelayMinutes } from "@/lib/fms/step-display";
import {
  FMS_FULFILLMENT_DISPATCH_PATH,
  FMS_FULFILLMENT_PO_PATH,
  FMS_FULFILLMENT_SALES_ORDER_PATH,
  FMS_FULFILLMENT_STOCK_CHECK_PATH,
} from "@/lib/fms/sales-fulfillment";

type StepStateSlice = {
  status: string;
  plannedAt: Date | null;
  actualAt: Date | null;
  delayMinutes: number | null;
  owner: { name: string | null; email: string } | null;
  step: { stepName: string };
};

function boardHrefForRole(role: SalesOrderFmsRole) {
  switch (role) {
    case "PO":
      return FMS_FULFILLMENT_PO_PATH;
    case "DISPATCH":
      return FMS_FULFILLMENT_DISPATCH_PATH;
    case "STOCK_CHECK":
      return FMS_FULFILLMENT_STOCK_CHECK_PATH;
    default:
      return FMS_FULFILLMENT_SALES_ORDER_PATH;
  }
}

function pickCurrentStep(stepStates: StepStateSlice[]) {
  const inProgress = stepStates.find((step) => step.status === "IN_PROGRESS");
  if (inProgress) {
    return inProgress;
  }
  const pending = stepStates.find((step) => step.status === "PENDING");
  if (pending) {
    return pending;
  }
  return stepStates[stepStates.length - 1] ?? null;
}

export function summarizeFmsInstance(
  instanceId: string,
  templateName: string,
  referenceLabel: string,
  instanceStatus: string,
  role: SalesOrderFmsRole,
  stepStates: StepStateSlice[],
): SalesOrderFmsLink {
  const current = pickCurrentStep(stepStates);
  const delayMinutes = current
    ? liveDelayMinutes(current.plannedAt, current.actualAt, current.delayMinutes)
    : null;
  const delayLabel = formatDelayLabel(delayMinutes);

  return {
    id: instanceId,
    referenceLabel,
    templateName,
    status: instanceStatus,
    role,
    currentStepName: current?.step.stepName ?? null,
    ownerName: current?.owner?.name ?? current?.owner?.email ?? null,
    delayLabel,
    isDelayed: Boolean(delayLabel),
    fmsHref: `/app/fms/instances/${instanceId}`,
    boardHref: boardHrefForRole(role),
  };
}

export function activeProcessSummary(instances: SalesOrderFmsLink[]) {
  const active = instances.find(
    (item) => item.status === "ACTIVE" && item.currentStepName,
  );
  if (!active) {
    return null;
  }
  return {
    label: active.templateName,
    step: active.currentStepName!,
    owner: active.ownerName,
    delayLabel: active.delayLabel,
    isDelayed: active.isDelayed,
    href: active.fmsHref,
  };
}
