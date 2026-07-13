import { parseHost } from "@/lib/subdomain";

/**
 * Workspace guide FAB: show on workspace/tenant hosts and /app/* routes.
 * Hidden on marketing (Pulse site guide owns that) and on the AI product host.
 */
export function shouldShowWorkspaceAssistant(pathname: string, hostname: string) {
  const { kind } = parseHost(hostname);
  if (kind === "ai") return false;
  if (kind === "workspace" || kind === "tenant") {
    if (pathname.startsWith("/login")) return false;
    return true;
  }
  if (pathname.startsWith("/app")) return true;
  return false;
}
