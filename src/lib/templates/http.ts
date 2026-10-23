import { checkRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export async function checkCheckoutRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new Error("Cross-origin checkout is not allowed.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Error("Cross-site checkout is not allowed.");
  const limit = await checkRateLimit(
    rateLimitKeyFromHeaders("template-checkout", request.headers),
    30,
    60_000,
  );
  if (!limit.allowed)
    throw new Error("Too many requests. Please wait one minute.");
}

export async function checkoutJson(request: Request) {
  const text = await request.text();
  if (text.length > 12000) throw new Error("Checkout request is too large.");
  return JSON.parse(text) as unknown;
}
