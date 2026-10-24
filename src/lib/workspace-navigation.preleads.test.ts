import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { getWorkspaceNavSections, visibleWorkspaceNavItems } from "./workspace-navigation";
function visible(overrides: Partial<SessionUser>) {
  const user: SessionUser = { id: "u", email: "test@example.com", name: "Test", role: "ADMIN", organizationId: "o", organizationName: "Test", organizationSlug: "sheetomatic-technologies", isSuperAdmin: false, isDepartmentHead: false, modules: ["CRM"], staffCode: null, organizationStatus: "ACTIVE", ...overrides };
  const items = getWorkspaceNavSections({ user, organizationSlug: user.organizationSlug }).flatMap(section => section.items);
  return visibleWorkspaceNavItems(user, items).flatMap(item => item.children ?? []).some(item => item.href === "/app/leads/preleads");
}
describe("Preleads navigation", () => {
  it("shows website admins", () => expect(visible({})).toBe(true));
  it("hides from other tenant owners", () => expect(visible({ role: "OWNER", organizationSlug: "other" })).toBe(false));
  it("hides from ordinary staff", () => expect(visible({ role: "STAFF" })).toBe(false));
  it("requires CRM entitlement", () => expect(visible({ modules: [] })).toBe(false));
});
