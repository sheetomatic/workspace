import { NextResponse, type NextRequest } from "next/server";
import {
  REQUEST_PATHNAME_HEADER,
  TENANT_SLUG_HEADER,
} from "@/lib/tenant-host";
import {
  apexOrigin,
  isAiAppPath,
  isApiPath,
  isStaticAssetPath,
  isWorkspacePath,
  parseHost,
} from "@/lib/subdomain";

function hasSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get("__Secure-authjs.session-token")?.value ||
      request.cookies.get("authjs.session-token")?.value,
  );
}

function withTenantHeader(
  response: NextResponse,
  tenantSlug: string,
  request: NextRequest,
) {
  response.headers.set(TENANT_SLUG_HEADER, tenantSlug);
  response.headers.set(
    REQUEST_PATHNAME_HEADER,
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return response;
}

function redirectToApexMarketing(request: NextRequest, pathname: string) {
  const target = new URL(pathname + request.nextUrl.search, apexOrigin());
  return NextResponse.redirect(target);
}

function workspaceLoginUrl(request: NextRequest, options?: { org?: string }) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  if (options?.org) {
    loginUrl.searchParams.set("org", options.org);
  }

  return loginUrl;
}

function aiLoginUrl(request: NextRequest, options?: { intent?: string }) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("product", "ai");
  loginUrl.searchParams.set(
    "intent",
    options?.intent ?? "login",
  );
  return loginUrl;
}

function handleProtectedAppRoutes(request: NextRequest, isLoggedIn: boolean) {
  const { pathname } = request.nextUrl;
  const isAppRoute = pathname.startsWith("/app");
  const isAiAppRoute = pathname.startsWith("/ai/app");
  const isLoginRoute = pathname === "/login";

  if ((isAppRoute || isAiAppRoute) && !isLoggedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    if (isAiAppRoute) {
      loginUrl.searchParams.set("product", "ai");
      if (pathname !== "/ai/app/onboarding") {
        loginUrl.searchParams.set("intent", "login");
      } else {
        loginUrl.searchParams.set("intent", "start");
      }
    }
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/app/whatsapp" || pathname.startsWith("/app/whatsapp/")) {
    const aiSettings = request.nextUrl.clone();
    aiSettings.pathname = "/ai/app/settings";
    return NextResponse.redirect(aiSettings);
  }

  if (pathname === "/ai/app/channels") {
    const campaign = request.nextUrl.clone();
    campaign.pathname = "/ai/app/campaign";
    return NextResponse.redirect(campaign);
  }

  const legacyAiRedirects: Record<string, string> = {
    "/app/inbox": "/ai/app/inbox",
    "/app/ai-brain": "/ai/app/ai-brain",
    "/app/knowledge": "/ai/app/knowledge",
    "/app/automations": "/ai/app/automations",
    "/app/contacts": "/ai/app/contacts",
    "/app/tickets": "/ai/app/tickets",
    "/app/integrations": "/ai/app/integrations",
  };

  if (legacyAiRedirects[pathname]) {
    const target = request.nextUrl.clone();
    target.pathname = legacyAiRedirects[pathname];
    return NextResponse.redirect(target);
  }

  if (isLoginRoute && isLoggedIn) {
    if (request.nextUrl.searchParams.has("error")) {
      return NextResponse.next();
    }

    const product = request.nextUrl.searchParams.get("product");
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const appUrl = request.nextUrl.clone();
    appUrl.pathname =
      callbackUrl && callbackUrl.startsWith("/")
        ? callbackUrl
        : product === "ai"
          ? "/ai/app"
          : "/app";
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  return null;
}

function workspacePortalHost(request: NextRequest) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "sheetomatic.com";
  return `workspace.${root}`;
}

/** Apex/www marketing only — skip localhost and preview hosts (no workspace subdomain). */
function isApexMarketingHost(hostname: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "sheetomatic.com";
  return hostname === root || hostname === `www.${root}`;
}

/** Send apex /app and non-AI /login to the workspace portal host. */
function redirectMarketingToWorkspacePortal(request: NextRequest) {
  const hostname =
    request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (!isApexMarketingHost(hostname)) {
    return null;
  }

  const { pathname } = request.nextUrl;
  const product = request.nextUrl.searchParams.get("product");

  if (pathname.startsWith("/app")) {
    const target = request.nextUrl.clone();
    target.hostname = workspacePortalHost(request);
    target.protocol = "https:";
    // Unauthed apex /app → login directly (skip workspace /app → /login hop).
    // Apex rarely has the session cookie (host-scoped), so this is the common path.
    if (!hasSessionCookie(request)) {
      const callbackUrl = pathname + request.nextUrl.search;
      target.pathname = "/login";
      target.search = "";
      target.searchParams.set("callbackUrl", callbackUrl);
    }
    return NextResponse.redirect(target);
  }

  if (
    (pathname === "/login" || pathname.startsWith("/login/")) &&
    product !== "ai"
  ) {
    const target = request.nextUrl.clone();
    target.hostname = workspacePortalHost(request);
    target.protocol = "https:";
    return NextResponse.redirect(target);
  }

  return null;
}

function handleWorkspacePortalHost(request: NextRequest, isLoggedIn: boolean) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (host.startsWith("app.")) {
    const target = request.nextUrl.clone();
    target.hostname = workspacePortalHost(request);
    target.protocol = "https:";
    return NextResponse.redirect(target);
  }

  const { pathname } = request.nextUrl;

  if (isApiPath(pathname) || isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(workspaceLoginUrl(request));
  }

  if (pathname.startsWith("/ai/app")) {
    const aiHost = request.nextUrl.clone();
    aiHost.hostname = `ai.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "sheetomatic.com"}`;
    aiHost.pathname = pathname;
    return NextResponse.redirect(aiHost);
  }

  if (!isWorkspacePath(pathname)) {
    return redirectToApexMarketing(request, pathname);
  }

  const protectedResponse = handleProtectedAppRoutes(request, isLoggedIn);
  return protectedResponse ?? NextResponse.next();
}

function handleAiPortalHost(request: NextRequest, isLoggedIn: boolean) {
  const { pathname } = request.nextUrl;

  if (isApiPath(pathname) || isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (isLoggedIn) {
      const appUrl = request.nextUrl.clone();
      appUrl.pathname = "/ai/app";
      appUrl.search = "";
      return NextResponse.redirect(appUrl);
    }
    return NextResponse.redirect(aiLoginUrl(request));
  }

  if (pathname.startsWith("/app")) {
    const workspaceHost = request.nextUrl.clone();
    workspaceHost.hostname = workspacePortalHost(request);
    workspaceHost.pathname = pathname;
    return NextResponse.redirect(workspaceHost);
  }

  if (!isAiAppPath(pathname) && pathname !== "/ai") {
    return redirectToApexMarketing(request, pathname);
  }

  const protectedResponse = handleProtectedAppRoutes(request, isLoggedIn);
  return protectedResponse ?? NextResponse.next();
}

function handleTenantHost(
  request: NextRequest,
  tenantSlug: string,
  isLoggedIn: boolean,
) {
  const { pathname } = request.nextUrl;

  if (isApiPath(pathname) || isStaticAssetPath(pathname)) {
    return withTenantHeader(NextResponse.next(), tenantSlug, request);
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      workspaceLoginUrl(request, { org: tenantSlug }),
    );
  }

  if (pathname.startsWith("/ai/app") || pathname === "/ai") {
    const aiHost = request.nextUrl.clone();
    aiHost.hostname = `ai.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "sheetomatic.com"}`;
    aiHost.pathname = pathname;
    return NextResponse.redirect(aiHost);
  }

  if (!isWorkspacePath(pathname)) {
    return redirectToApexMarketing(request, pathname);
  }

  if (
    (pathname === "/login" || pathname.startsWith("/login/")) &&
    !request.nextUrl.searchParams.has("org")
  ) {
    if (pathname === "/login") {
      const loginUrl = workspaceLoginUrl(request, { org: tenantSlug });
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      if (callbackUrl) {
        loginUrl.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(loginUrl);
    }

    const loginSubpathUrl = request.nextUrl.clone();
    loginSubpathUrl.searchParams.set("org", tenantSlug);
    return NextResponse.redirect(loginSubpathUrl);
  }

  const protectedResponse = handleProtectedAppRoutes(request, isLoggedIn);
  if (protectedResponse) {
    return protectedResponse;
  }

  const rewriteUrl = request.nextUrl.clone();
  const response = NextResponse.rewrite(rewriteUrl);
  return withTenantHeader(response, tenantSlug, request);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);
  const parsedHost = parseHost(request.headers.get("host"));

  if (parsedHost.kind === "workspace") {
    return handleWorkspacePortalHost(request, isLoggedIn);
  }

  if (parsedHost.kind === "ai") {
    return handleAiPortalHost(request, isLoggedIn);
  }

  if (parsedHost.kind === "tenant" && parsedHost.tenantSlug) {
    return handleTenantHost(request, parsedHost.tenantSlug, isLoggedIn);
  }

  const marketingWorkspaceRedirect = redirectMarketingToWorkspacePortal(request);
  if (marketingWorkspaceRedirect) {
    return marketingWorkspaceRedirect;
  }

  const protectedResponse = handleProtectedAppRoutes(request, isLoggedIn);
  if (protectedResponse) {
    return protectedResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)",
  ],
};
