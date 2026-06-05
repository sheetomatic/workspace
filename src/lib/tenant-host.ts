import { headers } from "next/headers";
import { parseHost } from "@/lib/subdomain";

const TENANT_SLUG_HEADER = "x-tenant-slug";

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
