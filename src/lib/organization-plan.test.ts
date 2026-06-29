import { describe, expect, it } from "vitest";
import { client50OnboardingPreset } from "@/lib/org-onboarding";

describe("organization plan presets", () => {
  it("client 50 activation preset excludes HR module", () => {
    const preset = client50OnboardingPreset();
    expect(preset.allowedModules).not.toContain("HR");
    expect(preset.maxMembers).toBe(50);
  });
});
