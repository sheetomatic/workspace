/**
 * Client-safe CRM deep-link helpers (Open from Payments / Meetings / etc.).
 * No server-only imports — safe for Client Components.
 */

export const CRM_DRAWER_TABS = [
  "details",
  "activity",
  "meeting",
  "payments",
  "quote",
  "projects",
  "training",
] as const;

export type CrmDrawerTab = (typeof CRM_DRAWER_TABS)[number];

/** Alias used by CRM submodule Open links (`CrmClientGroups`). */
export type CrmLeadOpenTab = CrmDrawerTab;

export function parseCrmDrawerTab(value: unknown): CrmDrawerTab | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return (CRM_DRAWER_TABS as readonly string[]).includes(normalized)
    ? (normalized as CrmDrawerTab)
    : null;
}

/** Alias for submodule / workspace consumers. */
export function parseCrmLeadOpenTab(value: unknown): CrmLeadOpenTab | null {
  return parseCrmDrawerTab(value);
}

/**
 * Deep-link into CRM with a specific lead (and optional drawer tab).
 * Defaults period to `all` so the lead is not filtered out of a narrow period.
 */
export function crmLeadOpenHref(
  leadId: string,
  options?: { tab?: string; period?: string },
) {
  const id = leadId.trim();
  const params = new URLSearchParams();
  params.set("leadId", id);
  params.set("period", options?.period?.trim() || "all");
  const tab = parseCrmDrawerTab(options?.tab);
  if (tab) {
    params.set("tab", tab);
  }
  return `/app/leads?${params.toString()}`;
}
