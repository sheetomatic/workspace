/**
 * Per-user sidebar + home widget visibility.
 * Filters display only — never grants modules the org/role does not allow.
 */

export type WorkspaceNavPrefsMode = "focus" | "all" | "custom";

export type WorkspaceNavPrefs = {
  version: 1;
  mode: WorkspaceNavPrefsMode;
  /** When mode is custom, only these nav ids are shown (plus always-on). */
  visibleIds: string[];
};

/**
 * Calm first experience: BCI suite ids + CRM (`leads`, separate SKU) + Tasks.
 * CRM show/hide is independent — not nested under BCI in the sidebar.
 * Departments stay tucked behind Customize.
 */
export const DEFAULT_FOCUSED_NAV_IDS = [
  "fms",
  "leads",
  "checklists",
  "ea",
  "pc",
  "em",
  "tasks",
] as const;

/** Never hidden by focus/custom prefs (still role/module gated). */
export const ALWAYS_VISIBLE_NAV_IDS = new Set([
  "settings",
  "team",
  "cases-home",
  "cases-import",
]);

/** Home widgets that stay visible regardless of sidebar focus. */
export const ALWAYS_VISIBLE_WIDGET_IDS = new Set(["collection"]);

export const DEFAULT_WORKSPACE_NAV_PREFS: WorkspaceNavPrefs = {
  version: 1,
  mode: "focus",
  visibleIds: [...DEFAULT_FOCUSED_NAV_IDS],
};

export type NavPreferenceOption = {
  id: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
};

export type DashboardWidgetId =
  | "leads"
  | "salesOrders"
  | "fms"
  | "ims"
  | "tasks"
  | "checklists"
  | "em"
  | "recruitment"
  | "collection";

/** Map home widgets → nav preference ids. */
export const WIDGET_NAV_ID: Record<DashboardWidgetId, string> = {
  leads: "leads",
  salesOrders: "dept-sales",
  fms: "fms",
  ims: "dept-store",
  tasks: "tasks",
  checklists: "checklists",
  em: "em",
  recruitment: "dept-hr",
  collection: "reports",
};

export function parseWorkspaceNavPrefs(value: unknown): WorkspaceNavPrefs {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_WORKSPACE_NAV_PREFS };
  }
  const raw = value as Record<string, unknown>;
  const mode =
    raw.mode === "all" || raw.mode === "custom" || raw.mode === "focus"
      ? raw.mode
      : "focus";
  const visibleIds = Array.isArray(raw.visibleIds)
    ? raw.visibleIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [...DEFAULT_FOCUSED_NAV_IDS];

  return {
    version: 1,
    mode,
    visibleIds:
      mode === "custom" && visibleIds.length === 0
        ? [...DEFAULT_FOCUSED_NAV_IDS]
        : visibleIds,
  };
}

export function resolveVisibleNavIdSet(prefs: WorkspaceNavPrefs): Set<string> | null {
  if (prefs.mode === "all") {
    return null; // null = show everything allowed
  }
  if (prefs.mode === "custom") {
    return new Set([...prefs.visibleIds, ...ALWAYS_VISIBLE_NAV_IDS]);
  }
  return new Set([...DEFAULT_FOCUSED_NAV_IDS, ...ALWAYS_VISIBLE_NAV_IDS]);
}

export function isNavIdVisible(
  prefs: WorkspaceNavPrefs,
  navId: string | undefined,
): boolean {
  if (!navId || ALWAYS_VISIBLE_NAV_IDS.has(navId)) {
    return true;
  }
  const visible = resolveVisibleNavIdSet(prefs);
  if (!visible) {
    return true;
  }
  return visible.has(navId);
}

export function isDashboardWidgetVisible(
  prefs: WorkspaceNavPrefs,
  widgetId: DashboardWidgetId,
): boolean {
  if (ALWAYS_VISIBLE_WIDGET_IDS.has(widgetId)) {
    return true;
  }
  return isNavIdVisible(prefs, WIDGET_NAV_ID[widgetId]);
}
