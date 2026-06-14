/** Web Based API is dev-only unless explicitly enabled for production. */
export function isWebBasedApiUiEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_WEB_BASED_API?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV !== "production";
}
