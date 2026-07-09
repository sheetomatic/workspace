/** Client-safe public dispatch slip URL (no server-only). */
export function buildDispatchPublicUrl(shareToken: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "https://sheetomatic.com";
  return `${base}/dispatch/${shareToken}`;
}
