import { ROOT_DOMAIN } from "@/lib/subdomain";

/** Generic workspace portal — workspace.sheetomatic.com (app. redirects in middleware). */
export function workspacePortalOrigin(protocol = "https") {
  return `${protocol}://workspace.${ROOT_DOMAIN}`;
}

/** @deprecated Use workspacePortalOrigin */
export function appPortalOrigin(protocol = "https") {
  return workspacePortalOrigin(protocol);
}

export function aiPortalOrigin(protocol = "https") {
  return `${protocol}://ai.${ROOT_DOMAIN}`;
}

export function tenantPortalOrigin(slug: string, protocol = "https") {
  return `${protocol}://${slug}.${ROOT_DOMAIN}`;
}

export function workspaceLoginHref(options?: { org?: string }) {
  if (options?.org) {
    return `${tenantPortalOrigin(options.org)}/login?org=${encodeURIComponent(options.org)}`;
  }
  return `${workspacePortalOrigin()}/login`;
}

/** Sheetomatic Workspace marketing → auth entry points (always workspace portal). */
export const WORKSPACE_LOGIN_HREF = workspaceLoginHref();
/** Self-serve signup is closed — keep this equal to login so old links do not open a register form. */
export const WORKSPACE_SIGNUP_HREF = WORKSPACE_LOGIN_HREF;
