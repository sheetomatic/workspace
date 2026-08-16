import { describe, expect, it } from "vitest";
import { decodeLearnSession, encodeLearnSession } from "@/lib/learn/session";

describe("learn session cookie", () => {
  it("round-trips an enrollment id", () => {
    const raw = encodeLearnSession("enr_123");
    const parsed = decodeLearnSession(raw);
    expect(parsed?.enrollmentId).toBe("enr_123");
  });

  it("rejects a tampered cookie", () => {
    const raw = encodeLearnSession("enr_123");
    expect(decodeLearnSession(`${raw}x`)).toBeNull();
  });
});
