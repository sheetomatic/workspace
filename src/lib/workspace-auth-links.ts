import { ROOT_DOMAIN } from "@/lib/subdomain";

/** Sheetomatic Workspace marketing → auth entry points */
export const WORKSPACE_LOGIN_HREF = "/login";
export const WORKSPACE_SIGNUP_HREF = "/login?intent=start";

export function appPortalOrigin(protocol = "https") {
  return `${protocol}://app.${ROOT_DOMAIN}`;
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
  return `${appPortalOrigin()}/login`;
}
