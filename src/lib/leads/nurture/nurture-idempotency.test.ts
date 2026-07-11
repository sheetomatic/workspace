import { describe, expect, it } from "vitest";
import { mergeLeadRawPayload } from "@/lib/leads/merge-raw-payload";
import {
  canSendEvent,
  eventAlreadySent,
  readNurtureState,
  WELCOME_COOLDOWN_HOURS,
} from "@/lib/leads/nurture/state";

describe("mergeLeadRawPayload", () => {
  it("preserves nurture.sentEvents when WA sync replaces payload", () => {
    const existing = {
      nurture: {
        sentEvents: { welcome: "2026-07-11T06:39:00.000Z" },
        lastSentAt: "2026-07-11T06:39:00.000Z",
      },
      pipelineStage: "NEW",
    };
    const incoming = {
      pipelineStage: "QUALIFIED",
      leadCaptureComplete: true,
    };

    const merged = mergeLeadRawPayload(existing, incoming) as Record<string, unknown>;
    expect(merged.pipelineStage).toBe("QUALIFIED");
    expect(merged.leadCaptureComplete).toBe(true);
    expect(merged.nurture).toEqual(existing.nurture);
  });

  it("merges sentEvents when both sides have nurture", () => {
    const existing = {
      nurture: { sentEvents: { welcome: "a" }, lastSentAt: "a" },
    };
    const incoming = {
      nurture: { sentEvents: { assigned: "b" }, lastAssignedNurtureId: "u1" },
    };

    const merged = mergeLeadRawPayload(existing, incoming) as {
      nurture: { sentEvents: Record<string, string>; lastAssignedNurtureId?: string };
    };
    expect(merged.nurture.sentEvents).toEqual({ welcome: "a", assigned: "b" });
    expect(merged.nurture.lastAssignedNurtureId).toBe("u1");
  });

  it("returns incoming when there is no existing payload", () => {
    expect(mergeLeadRawPayload(null, { foo: 1 })).toEqual({ foo: 1 });
  });
});

describe("nurture welcome idempotency helpers", () => {
  it("reads nurture state from rawPayload", () => {
    expect(
      readNurtureState({
        nurture: { sentEvents: { welcome: "2026-01-01T00:00:00.000Z" } },
      }).sentEvents?.welcome,
    ).toBe("2026-01-01T00:00:00.000Z");
  });

  it("treats welcome as already sent", () => {
    expect(
      eventAlreadySent(
        { sentEvents: { welcome: "2026-07-11T06:39:00.000Z" } },
        "welcome",
      ),
    ).toBe(true);
    expect(canSendEvent({ sentEvents: { welcome: "x" } }, "welcome", 48)).toBe(false);
  });

  it("treats fresh claim as sent but stale claim as retryable", () => {
    const fresh = `claim:${new Date().toISOString()}`;
    expect(eventAlreadySent({ sentEvents: { welcome: fresh } }, "welcome")).toBe(true);

    const stale = `claim:${new Date(Date.now() - 10 * 60 * 1000).toISOString()}`;
    expect(eventAlreadySent({ sentEvents: { welcome: stale } }, "welcome")).toBe(false);
  });

  it("exports a 24h welcome cooldown constant", () => {
    expect(WELCOME_COOLDOWN_HOURS).toBe(24);
  });
});
