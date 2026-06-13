export const REDLAVA_PORTAL_DEFAULT_SIGNUP_ACCOUNT_ID =
  "69ba66e24e68ba4764253829";

export function redlavaPortalBrandName() {
  return "Sheetomatic WhatsApp";
}

/** Customer portal base (Sheetomatic WhatsApp / RedLava). */
export function redlavaDashboardUrl() {
  return (
    process.env.NEXT_PUBLIC_REDLAVA_DASHBOARD_URL?.trim().replace(/\/+$/, "") ||
    process.env.REDLAVA_DASHBOARD_URL?.trim().replace(/\/+$/, "") ||
    "https://wa.sheetomatic.com"
  );
}

export function redlavaDashboardPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${redlavaDashboardUrl()}${normalized}`;
}

export function redlavaSignupUrl(options?: {
  accId?: string;
  returnUrl?: string;
}) {
  const accId =
    options?.accId?.trim() ||
    process.env.REDLAVA_SIGNUP_ACCOUNT_ID?.trim() ||
    REDLAVA_PORTAL_DEFAULT_SIGNUP_ACCOUNT_ID;
  const params = new URLSearchParams({ accId });
  if (options?.returnUrl?.trim()) {
    params.set("returnUrl", options.returnUrl.trim());
  }
  return `${redlavaDashboardUrl()}/Signup?${params.toString()}`;
}

export function redlavaPortalApiKeysUrl() {
  return redlavaDashboardPath("/Integrations/ListApikey");
}

export function redlavaPortalConnectedAccountsUrl() {
  return redlavaDashboardPath("/ConnectedAccount");
}
