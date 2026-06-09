export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase() || "sheetomatic.com";

const RESERVED_SUBDOMAINS = new Set(["www", "app", "ai"]);

export type HostKind = "marketing" | "workspace" | "ai" | "tenant";

export type ParsedHost = {
  kind: HostKind;
  hostname: string;
  tenantSlug?: string;
};

function classifySubdomain(subdomain: string, hostname: string): ParsedHost {
  if (!subdomain || subdomain === "www") {
    return { kind: "marketing", hostname };
  }

  if (subdomain === "app") {
    return { kind: "workspace", hostname };
  }

  if (subdomain === "ai") {
    return { kind: "ai", hostname };
  }

  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { kind: "marketing", hostname };
  }

  return { kind: "tenant", hostname, tenantSlug: subdomain };
}

/** Parse the request Host header into marketing, workspace, AI, or tenant context. */
export function parseHost(host: string | null | undefined): ParsedHost {
  const raw = host?.trim().toLowerCase() ?? "";
  const hostname = raw.split(":")[0] ?? "";

  if (!hostname) {
    return { kind: "marketing", hostname: "" };
  }

  if (
    hostname.endsWith(".vercel.app") ||
    hostname === "vercel.app" ||
    hostname.endsWith(".vercel-dns.com")
  ) {
    return { kind: "marketing", hostname };
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { kind: "marketing", hostname };
  }

  if (hostname.endsWith(".localhost")) {
    const subdomain = hostname.slice(0, -".localhost".length);
    return classifySubdomain(subdomain, hostname);
  }

  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return { kind: "marketing", hostname };
  }

  const rootSuffix = `.${ROOT_DOMAIN}`;
  if (hostname.endsWith(rootSuffix)) {
    const subdomain = hostname.slice(0, -rootSuffix.length);
    return classifySubdomain(subdomain, hostname);
  }

  return { kind: "marketing", hostname };
}

export function apexOrigin(protocol = "https") {
  return `${protocol}://${ROOT_DOMAIN}`;
}

export function isLoginPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function isWorkspacePath(pathname: string) {
  return isLoginPath(pathname) || pathname.startsWith("/app");
}

export function isAiAppPath(pathname: string) {
  return isLoginPath(pathname) || pathname.startsWith("/ai/app");
}

export function isApiPath(pathname: string) {
  return pathname.startsWith("/api");
}

export function isStaticAssetPath(pathname: string) {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|css|js|map|webmanifest)$/i.test(
    pathname,
  );
}
