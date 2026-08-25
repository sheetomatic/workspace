import { NextResponse } from "next/server";
import { applySignedOutCookies, safeLogoutCallback } from "@/lib/auth-logout";

/** GET sign-out that actually clears host + domain session cookies (Auth.js GET /signout often does not). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = safeLogoutCallback(url.searchParams.get("callbackUrl"));
  const response = NextResponse.redirect(new URL(callbackUrl, url.origin));
  applySignedOutCookies(response);
  return response;
}
