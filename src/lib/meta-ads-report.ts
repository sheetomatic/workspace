import "server-only";
export const META_REPORT_ACCOUNT = "1289822315977891";
export type MetaSummary = { account_name?: string; date_start: string; date_stop: string; spend?: string; impressions?: string; reach?: string; clicks?: string; actions?: { action_type: string; value: string }[] };
export async function metaAdsReport(days: 7 | 30 = 30): Promise<{ state: "ready"; rows: MetaSummary[]; daily: MetaSummary[] | null } | { state: "unconfigured" } | { state: "unavailable" }> {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) return { state: "unconfigured" };
  try {
    const url = new URL(`https://graph.facebook.com/v23.0/act_${META_REPORT_ACCOUNT}/insights`);
    url.searchParams.set("fields", "account_name,spend,impressions,reach,clicks,actions");
    url.searchParams.set("date_preset", days === 7 ? "last_7d" : "last_30d");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { state: "unavailable" };
    const body = await response.json();
    if (!Array.isArray(body.data)) return { state: "unavailable" };
    const dailyUrl = new URL(url);
    dailyUrl.searchParams.set("time_increment", "1");
    dailyUrl.searchParams.set("limit", "100");
    let daily: MetaSummary[] | null = null;
    try {
      const response = await fetch(dailyUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const detail = await response.json();
        if (Array.isArray(detail.data) && !detail.paging?.next) daily = detail.data;
      }
    } catch { /* Preserve valid totals when daily reporting fails. */ }
    return { state: "ready", rows: body.data, daily };
  } catch { return { state: "unavailable" }; }
}
