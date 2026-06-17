import { isStepOverdue } from "@/lib/fms/step-display";

type StepStateSlice = {
  status: string;
  plannedAt: Date | null;
  actualAt: Date | null;
  delayMinutes: number | null;
};

type InstanceSlice = {
  stepStates: StepStateSlice[];
};

export type FmsPipelineCounts = {
  active: number;
  onTrack: number;
  delayed: number;
  pending: number;
};

export function computeStopCounts(stepStates: StepStateSlice[]): FmsPipelineCounts {
  let onTrack = 0;
  let delayed = 0;
  let pending = 0;

  for (const step of stepStates) {
    if (step.status === "PENDING") {
      pending += 1;
      continue;
    }
    if (step.status === "SKIPPED") {
      continue;
    }
    if (step.status === "DONE" || step.status === "IN_PROGRESS") {
      const overdue = isStepOverdue(
        step.status,
        step.plannedAt,
        step.actualAt,
        step.delayMinutes,
      );
      const storedDelay = step.delayMinutes !== null && step.delayMinutes > 0;
      if (overdue || storedDelay) {
        delayed += 1;
      } else {
        onTrack += 1;
      }
    }
  }

  const inProgress = stepStates.filter((step) => step.status === "IN_PROGRESS").length;

  return {
    active: inProgress > 0 ? inProgress : stepStates.some((step) => step.status === "PENDING") ? 1 : 0,
    onTrack,
    delayed,
    pending,
  };
}

export function computeFmsPipelineCounts(
  instances: InstanceSlice[],
): FmsPipelineCounts {
  let onTrack = 0;
  let delayed = 0;
  let pending = 0;

  for (const job of instances) {
    const current = job.stepStates.find((step) => step.status === "IN_PROGRESS");
    if (!current) {
      pending += 1;
      continue;
    }
    if (
      isStepOverdue(
        current.status,
        current.plannedAt,
        current.actualAt,
        current.delayMinutes,
      )
    ) {
      delayed += 1;
    } else {
      onTrack += 1;
    }
  }

  return {
    active: instances.length,
    onTrack,
    delayed,
    pending,
  };
}
