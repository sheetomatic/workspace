/** Same allowlist for chip links and inline markdown `[label](href)`. */
export function isAllowedSiteAssistantHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  // Block javascript:/data:/etc. and protocol-relative //evil.example
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("https://")) {
    return false;
  }
  if (value.startsWith("//")) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("https://workspace.") ||
    value.startsWith("https://wa.me/") ||
    value.startsWith("https://calendar.") ||
    value.startsWith("https://sheetomatic.")
  );
}
