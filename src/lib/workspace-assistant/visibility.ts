import {
  isAppBuilderStudioPath,
  isWorkspaceAppPath,
  parseHost,
} from "@/lib/subdomain";

/**
 * Workspace guide FAB: show on workspace/tenant hosts and /app/* routes.
 * Hidden on marketing (Pulse site guide owns that) and on the AI product host.
 */
export function shouldShowWorkspaceAssistant(pathname: string, hostname: string) {
  const { kind } = parseHost(hostname);
  if (kind === "ai" || kind === "learn") return false;
  if (isAppBuilderStudioPath(pathname)) return false;
  if (kind === "workspace" || kind === "tenant") {
    if (pathname.startsWith("/login")) return false;
    return true;
  }
  if (isWorkspaceAppPath(pathname)) return true;
  return false;
}
