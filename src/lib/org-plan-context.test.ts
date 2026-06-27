import { describe, expect, it } from "vitest";
import {
  fmsTemplateLimitMessage,
  isAtFmsTemplateLimit,
  isAtMemberLimit,
  type OrganizationPlanContext,
} from "@/lib/org-plan-context";
import { client50OnboardingPreset, CLIENT_50_LIMITS } from "@/lib/org-onboarding";

function context(
  overrides: Partial<OrganizationPlanContext>,
): OrganizationPlanContext {
  return {
    plan: "ENTERPRISE",
    allowedModules: ["TASKS", "FMS"],
    maxMembers: 50,
    maxFmsTemplates: 15,
    tierEnforced: true,
    orgAllowedModules: ["TASKS", "FMS"],
    memberCount: 0,
    fmsTemplateCount: 0,
    ...overrides,
  };
}

describe("org plan limits", () => {
  it("blocks members at cap when tier enforced", () => {
    expect(isAtMemberLimit(context({ memberCount: 50 }))).toBe(true);
    expect(isAtMemberLimit(context({ tierEnforced: false, memberCount: 100 }))).toBe(
      false,
    );
  });

  it("blocks FMS templates at cap when tier enforced", () => {
    expect(isAtFmsTemplateLimit(context({ fmsTemplateCount: 15 }))).toBe(true);
    expect(
      isAtFmsTemplateLimit(context({ tierEnforced: false, fmsTemplateCount: 99 })),
    ).toBe(false);
  });

  it("client 50 preset excludes HR and sets limits", () => {
    const preset = client50OnboardingPreset();
    expect(preset.allowedModules).not.toContain("HR");
    expect(preset.maxMembers).toBe(CLIENT_50_LIMITS.maxMembers);
    expect(preset.maxFmsTemplates).toBe(CLIENT_50_LIMITS.maxFmsTemplates);
  });

  it("formats limit messages", () => {
    expect(fmsTemplateLimitMessage(15)).toContain("15");
  });
});
