import { describe, expect, it } from "vitest";
import {
  BCI_CORE_MODULES,
  listOptionalAddons,
  parseAddonModulesFromForm,
} from "@/lib/workspace-addons.shared";

describe("workspace add-ons", () => {
  it("BCI core excludes Tasks", () => {
    expect(BCI_CORE_MODULES).toEqual(["FMS", "REPORTS", "APPROVALS"]);
    expect(BCI_CORE_MODULES).not.toContain("TASKS");
  });

  it("parses tasks-only add-on from form", () => {
    const formData = new FormData();
    formData.set("addon_tasks", "on");
    expect(parseAddonModulesFromForm(formData)).toEqual(["TASKS"]);
  });

  it("parses BCI core plus tasks add-on", () => {
    const formData = new FormData();
    formData.set("bciCore", "on");
    formData.set("addon_tasks", "on");
    const modules = parseAddonModulesFromForm(formData);
    expect(modules).toContain("FMS");
    expect(modules).toContain("TASKS");
  });

  it("lists optional add-ons separately from core", () => {
    const optional = listOptionalAddons([
      "FMS",
      "REPORTS",
      "APPROVALS",
      "TASKS",
      "CRM",
    ]);
    expect(optional.map((item) => item.key)).toEqual(["tasks", "crm"]);
  });

  it("parses CRM add-on from form", () => {
    const formData = new FormData();
    formData.set("addon_crm", "on");
    expect(parseAddonModulesFromForm(formData)).toEqual(["CRM"]);
  });
});
