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

function expireCookieHeader(
  name: string,
  extras?: { domain?: string; secure?: boolean },
) {
  const parts = [
    `${name}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (extras?.secure || name.startsWith("__Secure-") || name.startsWith("__Host-")) {
    parts.push("Secure");
  }
  if (extras?.domain && !name.startsWith("__Host-")) {
    parts.push(`Domain=${extras.domain}`);
  }
  return parts.join("; ");
}

function cookieDomainVariants(rawDomain: string | undefined) {
  const domain = rawDomain?.trim();
  if (!domain) {
    return [];
  }
  return Array.from(
    new Set([domain, domain.startsWith(".") ? domain.slice(1) : `.${domain}`]),
  );
}

/** Clear Auth.js cookies, including Domain=AUTH_COOKIE_DOMAIN copies. */
export function applySignedOutCookies(response: NextResponse) {
  const domains = cookieDomainVariants(process.env.AUTH_COOKIE_DOMAIN);

  for (const name of AUTH_COOKIE_NAMES) {
    response.headers.append("Set-Cookie", expireCookieHeader(name));
    if (name.startsWith("__Host-")) {
      continue;
    }
    for (const domain of domains) {
      response.headers.append(
        "Set-Cookie",
        expireCookieHeader(name, { domain }),
      );
    }
  }
}
