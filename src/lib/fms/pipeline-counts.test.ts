import { describe, expect, it } from "vitest";
import {
  computeFmsPipelineCounts,
  pipelineCountsFromInProgressSteps,
} from "@/lib/fms/pipeline-counts";

const onTime = {
  status: "IN_PROGRESS",
  plannedAt: new Date("2099-01-01T00:00:00.000Z"),
  actualAt: null,
  delayMinutes: null,
};

const overdue = {
  status: "IN_PROGRESS",
  plannedAt: new Date("2020-01-01T00:00:00.000Z"),
  actualAt: null,
  delayMinutes: 90,
};

describe("pipelineCountsFromInProgressSteps", () => {
  it("counts pending jobs without loading every stepState", () => {
    const counts = pipelineCountsFromInProgressSteps({
      activeInstanceCount: 4,
      inProgressSteps: [
        { instanceId: "a", ...onTime },
        { instanceId: "b", ...overdue },
      ],
    });
    expect(counts).toEqual({
      active: 4,
      onTrack: 1,
      delayed: 1,
      pending: 2,
    });
  });

  it("uses the first in-progress stop per instance", () => {
    const counts = pipelineCountsFromInProgressSteps({
      activeInstanceCount: 1,
      inProgressSteps: [
        { instanceId: "a", ...overdue },
        { instanceId: "a", ...onTime },
      ],
    });
    expect(counts.delayed).toBe(1);
    expect(counts.onTrack).toBe(0);
    expect(counts.pending).toBe(0);
  });
});

describe("computeFmsPipelineCounts", () => {
  it("matches the in-progress helper for the same jobs", () => {
    const instances = [
      { stepStates: [onTime] },
      { stepStates: [{ status: "PENDING", plannedAt: null, actualAt: null, delayMinutes: null }] },
      { stepStates: [overdue] },
    ];
    expect(computeFmsPipelineCounts(instances)).toEqual(
      pipelineCountsFromInProgressSteps({
        activeInstanceCount: 3,
        inProgressSteps: [
          { instanceId: "0", ...onTime },
          { instanceId: "2", ...overdue },
        ],
      }),
    );
  });
});
