export function isBillingPortalPath(pathname: string) {
  const path = pathname.split("?")[0] ?? pathname;
  return path === "/app/billing" || path.startsWith("/app/billing/");
}
