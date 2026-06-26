import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { parseHost } from "@/lib/subdomain";
import { tenantPortalOrigin } from "@/lib/workspace-auth-links";

export const TENANT_SLUG_HEADER = "x-tenant-slug";
export const REQUEST_PATHNAME_HEADER = "x-pathname";

function requestProtocol(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded === "http" || forwarded === "https") {
    return forwarded;
  }
  const host = headerStore.get("host") ?? "";
  return host.includes("localhost") ? "http" : "https";
}

/** Resolve tenant slug from middleware header or Host subdomain. */
export async function getRequestTenantSlug() {
  const headerStore = await headers();
  const fromHeader = headerStore.get(TENANT_SLUG_HEADER)?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  const parsed = parseHost(headerStore.get("host"));
  if (parsed.kind === "tenant" && parsed.tenantSlug) {
    return parsed.tenantSlug;
  }

  return null;
}

/** Current path + query for tenant-host redirects (set by middleware on tenant rewrites). */
export async function getRequestPathname() {
  const headerStore = await headers();
  const pathname = headerStore.get(REQUEST_PATHNAME_HEADER)?.trim();
  if (pathname?.startsWith("/")) {
    return pathname;
  }
  return "/app";
}

function tenantRedirectOrigin(slug: string, headerStore: Headers) {
  const protocol = requestProtocol(headerStore);
  const parsed = parseHost(headerStore.get("host"));
  if (parsed.hostname.endsWith(".localhost")) {
    return `${protocol}://${slug}.localhost`;
  }
  return tenantPortalOrigin(slug, protocol);
}

/**
 * When the request is on a tenant subdomain, ensure it matches the session org.
 * Super-admins may browse any tenant host; everyone else is redirected to their org host.
 */
export async function ensureSessionTenantHost(sessionUser: SessionUser) {
  if (sessionUser.isSuperAdmin) {
    return;
  }

  const headerStore = await headers();
  const tenantSlug = await getRequestTenantSlug();
  if (!tenantSlug || tenantSlug === sessionUser.organizationSlug) {
    return;
  }

  const pathname = await getRequestPathname();
  redirect(tenantRedirectOrigin(sessionUser.organizationSlug, headerStore) + pathname);
}
