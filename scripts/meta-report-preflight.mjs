// Read-only verification using the deployment's own secret; never print it.
const token = process.env.META_ADS_ACCESS_TOKEN;
if (!token) throw Error('Meta reporting token is missing in this deployment');
const response = await fetch('https://graph.facebook.com/v23.0/act_1289822315977891/insights?fields=account_id,impressions,reach,clicks,spend&date_preset=last_30d', {
  headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw Error(`Meta read-only reporting verification failed (HTTP ${response.status}); token value withheld`);
const data = await response.json();
if (!Array.isArray(data.data) || data.data.some(row => row.account_id !== '1289822315977891')) throw Error('Unexpected Meta account response');
console.log('[meta-report-preflight] PASS selected account read-only Insights access');
const daily = await fetch('https://graph.facebook.com/v23.0/act_1289822315977891/insights?fields=account_id,impressions,spend,clicks&date_preset=last_30d&time_increment=1&limit=100', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
if (!daily.ok) throw Error(`Meta daily reporting check failed (HTTP ${daily.status})`);
const detail = await daily.json();
if (!Array.isArray(detail.data) || detail.paging?.next) throw Error('Daily reporting incomplete');
console.log('[meta-report-preflight] PASS daily Insights access');
