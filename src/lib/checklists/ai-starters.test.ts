import { describe, expect, it } from "vitest";
import { getPcAiStarter, PC_AI_STARTERS } from "./ai-starters";

describe("getPcAiStarter", () => {
  it("resolves bank-recon and every other published starter", () => {
    expect(getPcAiStarter("bank-recon")?.label).toBe("Bank reconciliation");
    for (const starter of PC_AI_STARTERS) {
      expect(getPcAiStarter(starter.id)?.id).toBe(starter.id);
    }
  });

  it("returns null for missing or blank starter ids", () => {
    expect(getPcAiStarter(null)).toBeNull();
    expect(getPcAiStarter("")).toBeNull();
    expect(getPcAiStarter("not-a-starter")).toBeNull();
  });
});
