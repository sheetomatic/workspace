import { NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function safeLogoutCallback(raw: string | null | undefined) {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/login";
}

export function logoutHref(callbackUrl = "/login") {
  return `/api/auth/clear-session?callbackUrl=${encodeURIComponent(
    safeLogoutCallback(callbackUrl),
  )}`;
}

function expireCookie(
  response: NextResponse,
  name: string,
  extras?: { domain?: string; secure?: boolean },
) {
  const expired = new Date(0);
  response.cookies.set({
    name,
    value: "",
    path: "/",
    maxAge: 0,
    expires: expired,
    httpOnly: true,
    sameSite: "lax",
    ...(extras?.secure ? { secure: true } : {}),
    ...(extras?.domain ? { domain: extras.domain } : {}),
  });
  response.cookies.delete({
    name,
    path: "/",
    ...(extras?.domain ? { domain: extras.domain } : {}),
  });
}

/** Clear Auth.js cookies, including Domain=AUTH_COOKIE_DOMAIN copies. */
export function applySignedOutCookies(response: NextResponse) {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  const domainVariants = domain
    ? Array.from(
        new Set([
          domain,
          domain.startsWith(".") ? domain.slice(1) : `.${domain}`,
        ]),
      )
    : [];

  for (const name of AUTH_COOKIE_NAMES) {
    const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
    expireCookie(response, name, secure ? { secure: true } : undefined);
    if (name.startsWith("__Host-")) {
      continue;
    }
    for (const cookieDomain of domainVariants) {
      expireCookie(response, name, {
        domain: cookieDomain,
        ...(secure ? { secure: true } : {}),
      });
    }
  }
}
