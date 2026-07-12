import { parseHost } from "@/lib/subdomain";

/** Marketing-only: hide on workspace/tenant/ai hosts and /app, /ai, /login routes. */
export function shouldShowSiteAssistant(pathname: string, hostname: string) {
  const { kind } = parseHost(hostname);
  if (kind === "workspace" || kind === "tenant" || kind === "ai") {
    return false;
  }
  if (pathname.startsWith("/app")) return false;
  if (pathname === "/ai" || pathname.startsWith("/ai/")) return false;
  if (pathname.startsWith("/login")) return false;
  return true;
}
