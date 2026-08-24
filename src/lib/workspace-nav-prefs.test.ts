import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOCUSED_NAV_IDS,
  DEFAULT_WORKSPACE_NAV_PREFS,
  isDashboardWidgetVisible,
  isNavIdVisible,
  parseWorkspaceNavPrefs,
  resolveVisibleNavIdSet,
} from "@/lib/workspace-nav-prefs";

describe("workspace-nav-prefs", () => {
  it("defaults to focus mode with BCI suite + CRM + HRMS + Tasks", () => {
    const prefs = parseWorkspaceNavPrefs(null);
    expect(prefs).toEqual(DEFAULT_WORKSPACE_NAV_PREFS);
    expect(prefs.mode).toBe("focus");
    for (const id of DEFAULT_FOCUSED_NAV_IDS) {
      expect(isNavIdVisible(prefs, id)).toBe(true);
    }
    expect(isNavIdVisible(prefs, "dept-hr")).toBe(true);
    expect(isNavIdVisible(prefs, "app-builder")).toBe(true);
    expect(isNavIdVisible(prefs, "dept-store")).toBe(false);
    expect(isNavIdVisible(prefs, "settings")).toBe(true);
    expect(isNavIdVisible(prefs, "checklists")).toBe(false);
    expect(isNavIdVisible(prefs, "ea")).toBe(false);
    expect(isNavIdVisible(prefs, "pc")).toBe(false);
    expect(isNavIdVisible(prefs, "team")).toBe(false);
  });

  it("shows allowed modules in all mode but keeps retired nav hidden", () => {
    const prefs = parseWorkspaceNavPrefs({ mode: "all", visibleIds: [] });
    expect(resolveVisibleNavIdSet(prefs)).toBeNull();
    expect(isNavIdVisible(prefs, "dept-store")).toBe(true);
    expect(isNavIdVisible(prefs, "checklists")).toBe(false);
    expect(isNavIdVisible(prefs, "ea")).toBe(false);
    expect(isNavIdVisible(prefs, "pc")).toBe(false);
    expect(isNavIdVisible(prefs, "team")).toBe(false);
  });

  it("respects custom visible ids and always keeps settings", () => {
    const prefs = parseWorkspaceNavPrefs({
      mode: "custom",
      visibleIds: ["fms", "em"],
    });
    expect(isNavIdVisible(prefs, "fms")).toBe(true);
    expect(isNavIdVisible(prefs, "em")).toBe(true);
    expect(isNavIdVisible(prefs, "tasks")).toBe(false);
    expect(isNavIdVisible(prefs, "settings")).toBe(true);
    expect(isNavIdVisible(prefs, "team")).toBe(false);
  });

  it("maps home widgets to nav visibility without granting ACL", () => {
    const prefs = parseWorkspaceNavPrefs({
      mode: "focus",
      visibleIds: [...DEFAULT_FOCUSED_NAV_IDS],
    });
    expect(isDashboardWidgetVisible(prefs, "leads")).toBe(true);
    expect(isDashboardWidgetVisible(prefs, "fms")).toBe(true);
    expect(isDashboardWidgetVisible(prefs, "ims")).toBe(false);
    expect(isDashboardWidgetVisible(prefs, "recruitment")).toBe(true);
    expect(isDashboardWidgetVisible(prefs, "collection")).toBe(true);
  });
});
