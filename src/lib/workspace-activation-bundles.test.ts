import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTIVATION_BUNDLE,
  resolveActivationPreset,
} from "@/lib/workspace-activation-bundles";

describe("workspace activation bundles", () => {
  it("defaults to BCI FMS only", () => {
    expect(DEFAULT_ACTIVATION_BUNDLE).toBe("bci_starter");
    expect(resolveActivationPreset("unknown").allowedModules).not.toContain("TASKS");
  });

  it("resolves tasks-only bundle", () => {
    const preset = resolveActivationPreset("tasks_addon");
    expect(preset.allowedModules).toEqual(["TASKS"]);
    expect(preset.allowedModules).not.toContain("FMS");
  });

  it("resolves BCI + Tasks bundle", () => {
    const preset = resolveActivationPreset("bci_with_tasks");
    expect(preset.allowedModules).toContain("FMS");
    expect(preset.allowedModules).toContain("TASKS");
  });
});
