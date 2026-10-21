import { describe, expect, it } from "vitest";
import { hasFieldVisitProof } from "@/lib/hr/field-visit-rules";

describe("field visit evidence", () => {
  it("requires an uploaded proof attachment or a proof link for each location stamp", () => {
    expect(hasFieldVisitProof(null, null)).toBe(false);
    expect(hasFieldVisitProof("  ", "  ")).toBe(false);
    expect(hasFieldVisitProof("attachment-1", null)).toBe(true);
    expect(hasFieldVisitProof(null, "https://drive.google.com/file/1")).toBe(true);
  });
});
