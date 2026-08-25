import { applySignedOutCookies, safeLogoutCallback } from "@/lib/auth-logout";

export const dynamic = "force-dynamic";

/** GET sign-out that actually clears host + domain session cookies (Auth.js GET /signout often does not). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = safeLogoutCallback(url.searchParams.get("callbackUrl"));
  const headers = new Headers({
    Location: new URL(callbackUrl, url.origin).toString(),
    "Cache-Control": "no-store",
  });
  applySignedOutCookies(headers);
  return new Response(null, { status: 307, headers });
}
