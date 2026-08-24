import { describe, expect, it } from "vitest";
import {
  ACTIVATION_BUNDLE_OPTIONS,
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

  it("labels Tasks Management as its own SKU, not EA or PC", () => {
    const option = ACTIVATION_BUNDLE_OPTIONS.find((o) => o.value === "tasks_addon");
    expect(option?.label).toBe("Tasks Management only");
    expect(option?.label).not.toMatch(/EA|PC/);
    expect(option?.description).toMatch(/Not EA/);
    expect(option?.description).toMatch(/Not PC/);
  });

  it("resolves App Builder as its own SKU", () => {
    const preset = resolveActivationPreset("app_builder");
    expect(preset.allowedModules).toEqual(["APP_BUILDER"]);
    expect(preset.allowedModules).not.toContain("FMS");
    const option = ACTIVATION_BUNDLE_OPTIONS.find((o) => o.value === "app_builder");
    expect(option?.label).toBe("App Builder");
  });

  it("resolves BCI + Tasks bundle", () => {
    const preset = resolveActivationPreset("bci_with_tasks");
    expect(preset.allowedModules).toContain("FMS");
    expect(preset.allowedModules).toContain("TASKS");
  });
});
