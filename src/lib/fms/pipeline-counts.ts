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

type InProgressStepSlice = StepStateSlice & { instanceId: string };

/** Tile counts from ACTIVE job count + current IN_PROGRESS stops only. */
export function pipelineCountsFromInProgressSteps(params: {
  activeInstanceCount: number;
  inProgressSteps: InProgressStepSlice[];
}): FmsPipelineCounts {
  const seen = new Set<string>();
  let delayed = 0;
  let onTrack = 0;

  for (const step of params.inProgressSteps) {
    if (seen.has(step.instanceId)) {
      continue;
    }
    seen.add(step.instanceId);
    if (
      isStepOverdue(
        step.status,
        step.plannedAt,
        step.actualAt,
        step.delayMinutes,
      )
    ) {
      delayed += 1;
    } else {
      onTrack += 1;
    }
  }

  return {
    active: params.activeInstanceCount,
    onTrack,
    delayed,
    pending: Math.max(0, params.activeInstanceCount - seen.size),
  };
}

export function computeFmsPipelineCounts(
  instances: InstanceSlice[],
): FmsPipelineCounts {
  const inProgressSteps: InProgressStepSlice[] = [];
  for (const [index, job] of instances.entries()) {
    const current = job.stepStates.find((step) => step.status === "IN_PROGRESS");
    if (!current) {
      continue;
    }
    inProgressSteps.push({ ...current, instanceId: String(index) });
  }
  return pipelineCountsFromInProgressSteps({
    activeInstanceCount: instances.length,
    inProgressSteps,
  });
}
