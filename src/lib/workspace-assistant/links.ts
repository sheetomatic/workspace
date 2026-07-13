/** Allowlist for workspace guide chip links and inline markdown. */
export function isAllowedWorkspaceAssistantHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("https://")) {
    return false;
  }
  if (value.startsWith("//")) return false;
  if (value.startsWith("/app")) return true;
  return (
    value.startsWith("https://workspace.") ||
    value.startsWith("https://sheetomatic.")
  );
}
