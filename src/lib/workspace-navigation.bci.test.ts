import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth";
import {
  filterNavItemsByPrefs,
  getWorkspaceNavSections,
  visibleWorkspaceNavItems,
} from "@/lib/workspace-navigation";
import { parseWorkspaceNavPrefs } from "@/lib/workspace-nav-prefs";

function bciStarterUser(): SessionUser {
  return {
    id: "u1",
    email: "owner@example.com",
    name: "Owner",
    role: "OWNER",
    organizationId: "org1",
    organizationName: "Demo",
    organizationSlug: "demo",
    isSuperAdmin: false,
    isDepartmentHead: false,
    modules: ["FMS", "REPORTS", "APPROVALS"],
    staffCode: null,
    organizationStatus: "ACTIVE",
  };
}

function bciChildLabels(user: SessionUser) {
  const sections = getWorkspaceNavSections({
    user,
    organizationSlug: user.organizationSlug,
  });
  const allowed = visibleWorkspaceNavItems(user, sections.flatMap((s) => s.items));
  const shown = filterNavItemsByPrefs(
    allowed,
    parseWorkspaceNavPrefs({ mode: "custom", visibleIds: ["fms", "em"] }),
  );
  const bci = shown.find((item) => item.label === "BCI");
  return (bci?.children ?? []).map((child) => child.label);
}

describe("BCI suite nav", () => {
  it("keeps Tasks out of BCI and hides the suite until it is granted", () => {
    const user = bciStarterUser();
    user.role = "STAFF";
    user.modules = ["FMS", "TASKS", "REPORTS"];
    const sections = getWorkspaceNavSections({
      user,
      organizationSlug: user.organizationSlug,
    });
    const hidden = visibleWorkspaceNavItems(
      user,
      sections.flatMap((section) => section.items),
      null,
      null,
      null,
      false,
      [],
    );
    const hiddenLabels = hidden.flatMap((item) => [
      item.label,
      ...(item.children ?? []).map((child) => child.label),
    ]);
    expect(hiddenLabels).toContain("Tasks Management");
    expect(hiddenLabels).not.toContain("Task Delegation");
    expect(hiddenLabels).not.toContain("FMS");
    expect(hiddenLabels).not.toContain("Check Lists");
    expect(hiddenLabels).not.toContain("PC jobs");

    const granted = visibleWorkspaceNavItems(
      user,
      sections.flatMap((section) => section.items),
      null,
      null,
      null,
      false,
      ["taskDelegation", "checklists"],
    );
    const grantedLabels = granted.flatMap((item) => [
      item.label,
      ...(item.children ?? []).map((child) => child.label),
    ]);
    expect(grantedLabels).toContain("Task Delegation");
    expect(grantedLabels).toContain("Check Lists");
    expect(grantedLabels).not.toContain("FMS");
    expect(grantedLabels).toContain("Tasks Management");
  });

  it("lists Check Lists for BCI starter orgs without TASKS", () => {
    const labels = bciChildLabels(bciStarterUser());
    expect(labels).toContain("FMS");
    expect(labels).toContain("Check Lists");
    expect(labels).toContain("EM");
    expect(labels).toContain("MIS Score");
    expect(labels).toContain("PC jobs");
    expect(labels).not.toContain("Tasks Delegations");
  });
});
