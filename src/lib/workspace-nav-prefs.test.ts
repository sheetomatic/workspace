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
  it("defaults to focus mode with BCI suite + CRM + Tasks", () => {
    const prefs = parseWorkspaceNavPrefs(null);
    expect(prefs).toEqual(DEFAULT_WORKSPACE_NAV_PREFS);
    expect(prefs.mode).toBe("focus");
    for (const id of DEFAULT_FOCUSED_NAV_IDS) {
      expect(isNavIdVisible(prefs, id)).toBe(true);
    }
    expect(isNavIdVisible(prefs, "dept-hr")).toBe(false);
    expect(isNavIdVisible(prefs, "settings")).toBe(true);
  });

  it("shows everything in all mode", () => {
    const prefs = parseWorkspaceNavPrefs({ mode: "all", visibleIds: [] });
    expect(resolveVisibleNavIdSet(prefs)).toBeNull();
    expect(isNavIdVisible(prefs, "dept-store")).toBe(true);
  });

  it("respects custom visible ids and always keeps settings/team", () => {
    const prefs = parseWorkspaceNavPrefs({
      mode: "custom",
      visibleIds: ["fms", "em"],
    });
    expect(isNavIdVisible(prefs, "fms")).toBe(true);
    expect(isNavIdVisible(prefs, "em")).toBe(true);
    expect(isNavIdVisible(prefs, "tasks")).toBe(false);
    expect(isNavIdVisible(prefs, "team")).toBe(true);
  });

  it("maps home widgets to nav visibility without granting ACL", () => {
    const prefs = parseWorkspaceNavPrefs({
      mode: "focus",
      visibleIds: [...DEFAULT_FOCUSED_NAV_IDS],
    });
    expect(isDashboardWidgetVisible(prefs, "leads")).toBe(true);
    expect(isDashboardWidgetVisible(prefs, "fms")).toBe(true);
    expect(isDashboardWidgetVisible(prefs, "ims")).toBe(false);
    expect(isDashboardWidgetVisible(prefs, "recruitment")).toBe(false);
    expect(isDashboardWidgetVisible(prefs, "collection")).toBe(true);
  });
});
