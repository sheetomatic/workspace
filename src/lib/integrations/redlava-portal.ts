/** Sheetomatic WhatsApp customer portal (always wa.sheetomatic.com). */
export const SHEETOMATIC_WHATSAPP_PORTAL_URL = "https://wa.sheetomatic.com";

export const REDLAVA_PORTAL_DEFAULT_SIGNUP_ACCOUNT_ID =
  "69ba66e24e68ba4764253829";

export function redlavaPortalBrandName() {
  return "Sheetomatic WhatsApp";
}

export function redlavaDashboardUrl() {
  return SHEETOMATIC_WHATSAPP_PORTAL_URL;
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
