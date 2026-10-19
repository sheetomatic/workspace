import { describe, expect, it } from "vitest";
import type { Role, WorkspaceModule } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { canAccessWorkspacePath, grantedSuiteParts } from "@/lib/workspace-access";
import { effectiveMemberModules, resolveOrgAllowedModules } from "@/lib/org-plan-presets";
import { getWorkspaceNavSections, visibleWorkspaceNavItems, type WorkspaceNavItem } from "@/lib/workspace-navigation";
import { BUSINESS_WORKSPACE_PLANS } from "@/lib/business-workspace-plans";
import { resolveProvisionAccess } from "@/lib/workspace-provision-access";
import { catalogRateForPlan } from "@/lib/billing/catalog";

function user(role: Role = "OWNER", modules: WorkspaceModule[] = ["CRM"]): SessionUser {
  return { id: "member", name: "Client", email: "client@example.test", role, modules,
    organizationId: "client", organizationSlug: "client", organizationName: "Client",
    organizationStatus: "ACTIVE", isSuperAdmin: false, isDepartmentHead: false, staffCode: null,
    enabledBciSubModules: [] };
}

function visibleLabels(account: SessionUser) {
  const items = getWorkspaceNavSections({ user: account, organizationSlug: account.organizationSlug }).flatMap((section) => section.items);
  const walk = (rows: WorkspaceNavItem[]): string[] => rows.flatMap((item) => [item.label, ...walk(item.children ?? [])]);
  return walk(visibleWorkspaceNavItems(account, items));
}

describe("explicit client module access", () => {
  it.each(["OWNER", "ADMIN", "MANAGER", "STAFF"] as const)("does not give Suite or Fleet to a CRM-only %s", (role) => {
    const account = user(role);
    const labels = visibleLabels(account);
    expect(labels).toContain("CRM");
    for (const label of ["Business Systems Suite", "Ash fleet", "Tasks Management", "Reports", "EM", "PC jobs", "My Space"]) expect(labels).not.toContain(label);
    for (const path of ["/app/fleet", "/api/fleet/board", "/app/checklists", "/app/pc/today", "/app/fms", "/app/em", "/app/tasks", "/app/reports"]) expect(canAccessWorkspacePath(account, path)).toBe(false);
  });

  it("treats empty member and client selections as no access, including owners", () => {
    expect(resolveOrgAllowedModules([])).toEqual([]);
    expect(effectiveMemberModules("OWNER", [], ["CRM", "FMS"])).toEqual([]);
    expect(effectiveMemberModules("ADMIN", [], ["CRM", "FMS"])).toEqual([]);
    expect(effectiveMemberModules("OWNER", ["CRM"], ["CRM", "FMS"])).toEqual(["CRM"]);
    expect(effectiveMemberModules("STAFF", ["CRM"], [])).toEqual([]);
  });

  it("requires explicit Suite parts for admins with the Suite module", () => {
    const account = user("ADMIN", ["FMS"]);
    expect(visibleLabels(account)).not.toContain("Business Systems Suite");
    account.enabledBciSubModules = ["checklists"];
    const labels = visibleLabels(account);
    expect(labels).toContain("Check Lists");
    expect(labels).not.toContain("FMS");
    expect(labels).not.toContain("PC jobs");
    expect(canAccessWorkspacePath(account, "/app/checklists")).toBe(true);
    expect(canAccessWorkspacePath(account, "/app/fms")).toBe(false);
  });

  it("does not grant Suite through stale person permissions when the org module is removed", () => {
    const account = user();
    account.enabledBciSubModules = ["checklists", "em", "taskDelegation"];
    expect(grantedSuiteParts(account)).toEqual([]);
    expect(canAccessWorkspacePath(account, "/app/tasks")).toBe(false);
  });

  it("caps person Suite selections to the client trial selection", () => {
    const account = user("OWNER", ["FMS"]);
    expect(grantedSuiteParts(account, ["fms", "em", "pc"], ["pc"])).toEqual(["pc"]);
    expect(grantedSuiteParts(account, ["fms"], [])).toEqual([]);
  });

  it("requires a distinct Fleet grant", () => {
    const account = user("MANAGER", ["FLEET"]);
    expect(visibleLabels(account)).toContain("Ash fleet");
    expect(canAccessWorkspacePath(account, "/api/fleet/board")).toBe(true);
    expect(visibleLabels(account)).not.toContain("Business Systems Suite");
  });

  it.each(BUSINESS_WORKSPACE_PLANS)("uses the exact $label plan and monthly price", (plan) => {
    const preset = resolveProvisionAccess({ bundle: plan.bundle, selectedModules: [...plan.modules], selectedSuiteParts: ["fms", "checklists", "taskDelegation", "em", "mis", "pc"], maxMembers: 4, maxFmsTemplates: 2 });
    expect(preset.plan).toBe(plan.id);
    expect(preset.allowedModules).toEqual(plan.modules);
    expect(preset.allowedModules).not.toContain("FLEET");
    expect(preset.allowedModules).not.toContain("SOCIAL");
    expect(catalogRateForPlan(plan.id).monthlyRatePaise).toBe(plan.monthlyInr * 100);
    expect(preset.maxMembers).toBe(4);
  });

  it("Starter opens Suite task delegation and EM without extra standalone modules", () => {
    const account = user("OWNER", ["FMS"]);
    account.enabledBciSubModules = ["taskDelegation", "em", "mis"];
    expect(canAccessWorkspacePath(account, "/app/tasks")).toBe(true);
    expect(canAccessWorkspacePath(account, "/app/em")).toBe(true);
    expect(canAccessWorkspacePath(account, "/app/fms/scores")).toBe(true);
    expect(canAccessWorkspacePath(account, "/app/reports")).toBe(false);
    const labels = visibleLabels(account);
    expect(labels).toContain("Task Delegation");
    expect(labels).toContain("EM");
    expect(labels).not.toContain("Tasks Management");
    expect(labels).not.toContain("Reports");
  });

  it("preserves a trial subset and an explicitly empty selection", () => {
    const input = { bundle: "business_enterprise", maxMembers: 3, maxFmsTemplates: 0 };
    expect(resolveProvisionAccess({ ...input, selectedModules: ["CRM"], selectedSuiteParts: ["fms"] })).toMatchObject({ allowedModules: ["CRM"], enabledBciSubModules: [] });
    expect(resolveProvisionAccess({ ...input, selectedModules: [] }).allowedModules).toEqual([]);
  });

  it("rejects missing selections, unlisted modules and unconfirmed limits", () => {
    expect(() => resolveProvisionAccess({ bundle: "business_starter" })).toThrow(/tick/);
    expect(() => resolveProvisionAccess({ bundle: "business_starter", selectedModules: ["FLEET"] })).toThrow(/chosen plan/);
    expect(() => resolveProvisionAccess({ bundle: "business_starter", selectedModules: ["FMS"] })).toThrow(/limits/);
  });
});
