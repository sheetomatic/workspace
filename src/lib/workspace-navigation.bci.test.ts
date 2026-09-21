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
