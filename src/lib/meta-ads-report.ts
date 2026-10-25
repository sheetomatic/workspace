import "server-only";
export const META_REPORT_ACCOUNT = "1289822315977891";
export type MetaSummary = { account_name?: string; date_start: string; date_stop: string; spend?: string; impressions?: string; reach?: string; clicks?: string; actions?: { action_type: string; value: string }[] };
export async function metaAdsReport(): Promise<{ state: "ready"; rows: MetaSummary[] } | { state: "unconfigured" | "unavailable" }> {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) return { state: "unconfigured" };
  try {
    const url = new URL(`https://graph.facebook.com/v23.0/act_${META_REPORT_ACCOUNT}/insights`);
    url.searchParams.set("fields", "account_name,spend,impressions,reach,clicks,actions");
    url.searchParams.set("date_preset", "last_30d");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { state: "unavailable" };
    const body = await response.json();
    if (!Array.isArray(body.data)) return { state: "unavailable" };
    return { state: "ready", rows: body.data };
  } catch { return { state: "unavailable" }; }
}
