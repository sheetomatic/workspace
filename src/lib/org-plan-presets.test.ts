import { describe, expect, it } from "vitest";
import {
  allowedModulesForPlan,
  BCI_GROWTH_ALLOWED,
  BCI_STARTER_ALLOWED,
  mergeAllowedModules,
  TASKS_ADDON_ALLOWED,
} from "@/lib/org-plan-presets";
import {
  bciStarterOnboardingPreset,
  bciWithTasksOnboardingPreset,
  client50OnboardingPreset,
  tasksAddonOnboardingPreset,
} from "@/lib/org-onboarding";

describe("module bundling", () => {
  it("BCI Starter excludes Tasks (sold as separate add-on)", () => {
    expect(BCI_STARTER_ALLOWED).toEqual(["FMS", "REPORTS", "APPROVALS"]);
    expect(BCI_STARTER_ALLOWED).not.toContain("TASKS");
  });

  it("BCI Growth adds CRM, IMS, and HR but not Tasks", () => {
    expect(BCI_GROWTH_ALLOWED).toContain("CRM");
    expect(BCI_GROWTH_ALLOWED).toContain("IMS");
    expect(BCI_GROWTH_ALLOWED).toContain("HR");
    expect(BCI_GROWTH_ALLOWED).not.toContain("TASKS");
  });

  it("BCI Starter excludes CRM (sold as separate add-on)", () => {
    expect(BCI_STARTER_ALLOWED).not.toContain("CRM");
  });

  it("Tasks add-on is standalone", () => {
    expect(TASKS_ADDON_ALLOWED).toEqual(["TASKS"]);
    expect(allowedModulesForPlan("TASKS_ADDON")).toEqual(["TASKS"]);
  });

  it("bciWithTasks merges BCI core and Tasks for combined sales", () => {
    const preset = bciWithTasksOnboardingPreset();
    expect(preset.allowedModules).toEqual(
      mergeAllowedModules(BCI_STARTER_ALLOWED, TASKS_ADDON_ALLOWED),
    );
  });

  it("bciStarter preset has no Tasks", () => {
    const preset = bciStarterOnboardingPreset();
    expect(preset.allowedModules).not.toContain("TASKS");
  });

  it("tasksAddon preset has only Tasks", () => {
    const preset = tasksAddonOnboardingPreset();
    expect(preset.allowedModules).toEqual(["TASKS"]);
  });

  it("client 50 enterprise bundle still includes Tasks", () => {
    const preset = client50OnboardingPreset();
    expect(preset.allowedModules).toContain("TASKS");
    expect(preset.allowedModules).toContain("FMS");
  });
});
