import { describe, expect, it } from "vitest";
import {
  firstMatchingRouteRule,
  latestFmsVisitByStepId,
  parseRouteRules,
  planFmsAdvance,
  visitCountForStep,
} from "@/lib/fms/route-rules";

const maker = { id: "maker", stepName: "Maker" };
const checker = { id: "checker", stepName: "Checker" };
const done = { id: "file", stepName: "File" };
const steps = [maker, checker, done];

const rejectRule = {
  when: {
    source: "completion" as const,
    fieldKey: "decision",
    op: "eq" as const,
    value: "Reject",
  },
  then: { action: "goto" as const, stepId: maker.id },
};

describe("parseRouteRules", () => {
  it("ignores garbage and keeps valid if/then rows", () => {
    expect(parseRouteRules("nope")).toEqual([]);
    expect(
      parseRouteRules([
        { when: { source: "intake", fieldKey: "priority", op: "eq", value: "low" }, then: { action: "skip", stepId: checker.id } },
        { when: { source: "x" }, then: { action: "goto" } },
      ]),
    ).toEqual([
      {
        when: { source: "intake", fieldKey: "priority", op: "eq", value: "low" },
        then: { action: "skip", stepId: checker.id },
      },
    ]);
  });
});

describe("firstMatchingRouteRule", () => {
  it("matches completion and intake, first hit wins", () => {
    const skipLow = {
      when: {
        source: "intake" as const,
        fieldKey: "priority",
        op: "eq" as const,
        value: "low",
      },
      then: { action: "skip" as const, stepId: checker.id },
    };
    expect(
      firstMatchingRouteRule([rejectRule, skipLow], {
        completion: { decision: "Reject" },
        intake: { priority: "low" },
      })?.then.action,
    ).toBe("goto");
    expect(
      firstMatchingRouteRule([skipLow], {
        completion: {},
        intake: { priority: "LOW" },
      })?.then.stepId,
    ).toBe(checker.id);
    expect(
      firstMatchingRouteRule([skipLow], {
        completion: {},
        intake: { priority: "high" },
      }),
    ).toBeNull();
  });

  it("supports in and truthy ops", () => {
    const inRule = {
      when: {
        source: "completion" as const,
        fieldKey: "decision",
        op: "in" as const,
        value: ["Rework", "Reject"],
      },
      then: { action: "goto" as const, stepId: maker.id },
    };
    const filled = {
      when: {
        source: "intake" as const,
        fieldKey: "po_number",
        op: "truthy" as const,
      },
      then: { action: "complete_job" as const },
    };
    expect(
      firstMatchingRouteRule([inRule], {
        completion: { decision: "rework" },
        intake: {},
      })?.then.stepId,
    ).toBe(maker.id);
    expect(
      firstMatchingRouteRule([filled], {
        completion: {},
        intake: { po_number: "PO-9" },
      })?.then.action,
    ).toBe("complete_job");
    expect(
      firstMatchingRouteRule([filled], {
        completion: {},
        intake: { po_number: "  " },
      }),
    ).toBeNull();
  });
});

describe("planFmsAdvance", () => {
  it("keeps linear FMS: no rule → sortOrder + 1, last step completes the job", () => {
    expect(
      planFmsAdvance({ steps, currentStepId: maker.id, rule: null }),
    ).toEqual({ kind: "activate", stepId: checker.id, skipStepIds: [] });
    expect(
      planFmsAdvance({ steps, currentStepId: done.id, rule: null }),
    ).toEqual({ kind: "complete_job", skipStepIds: [] });
  });

  it("send-back: reject → goto maker, no skipped intermediates", () => {
    expect(
      planFmsAdvance({
        steps,
        currentStepId: checker.id,
        rule: rejectRule,
      }),
    ).toEqual({ kind: "activate", stepId: maker.id, skipStepIds: [] });
  });

  it("skip-by-field jumps over a step", () => {
    expect(
      planFmsAdvance({
        steps,
        currentStepId: maker.id,
        rule: {
          when: {
            source: "intake",
            fieldKey: "priority",
            op: "eq",
            value: "low",
          },
          then: { action: "skip", stepId: checker.id },
        },
      }),
    ).toEqual({ kind: "activate", stepId: done.id, skipStepIds: [checker.id] });
  });

  it("forward goto skips unused stops between", () => {
    expect(
      planFmsAdvance({
        steps,
        currentStepId: maker.id,
        rule: {
          when: {
            source: "intake",
            fieldKey: "priority",
            op: "eq",
            value: "low",
          },
          then: { action: "goto", stepId: done.id },
        },
      }),
    ).toEqual({ kind: "activate", stepId: done.id, skipStepIds: [checker.id] });
  });

  it("unknown stepId (other tenant) falls back to linear", () => {
    expect(
      planFmsAdvance({
        steps,
        currentStepId: maker.id,
        rule: {
          when: {
            source: "completion",
            fieldKey: "decision",
            op: "eq",
            value: "Reject",
          },
          then: { action: "goto", stepId: "tenant-b-step" },
        },
      }),
    ).toEqual({ kind: "activate", stepId: checker.id, skipStepIds: [] });
  });

  it("complete_job skips remaining pending stops", () => {
    expect(
      planFmsAdvance({
        steps,
        currentStepId: maker.id,
        rule: {
          when: {
            source: "intake",
            fieldKey: "cancel",
            op: "eq",
            value: "yes",
          },
          then: { action: "complete_job" },
        },
      }),
    ).toEqual({
      kind: "complete_job",
      skipStepIds: [checker.id, done.id],
    });
  });
});

describe("visits", () => {
  it("counts two visits on the same step without overwriting the first", () => {
    const states = [
      { stepId: maker.id, visitIndex: 0, status: "DONE" },
      { stepId: checker.id, visitIndex: 0, status: "DONE" },
      { stepId: maker.id, visitIndex: 1, status: "IN_PROGRESS" },
    ];
    expect(visitCountForStep(states, maker.id)).toBe(2);
    expect(latestFmsVisitByStepId(states).get(maker.id)?.visitIndex).toBe(1);
    expect(latestFmsVisitByStepId(states).get(checker.id)?.status).toBe("DONE");
  });
});
