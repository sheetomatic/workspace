import { NextResponse, type NextRequest } from "next/server";

function hasSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get("__Secure-authjs.session-token")?.value ||
      request.cookies.get("authjs.session-token")?.value,
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/ai/app/:path*", "/login"],
};
