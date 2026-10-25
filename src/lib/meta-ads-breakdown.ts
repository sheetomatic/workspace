import "server-only";
import { META_REPORT_ACCOUNT, type MetaSummary } from "./meta-ads-report";
export type AdInsight = MetaSummary & { ad_id: string; ad_name?: string; campaign_name?: string; adset_name?: string };
export type AdsBreakdown = {state:"ready";rows:AdInsight[];truncated:boolean}|{state:"unavailable"};
export async function metaAdsBreakdown(days:7|30):Promise<AdsBreakdown>{
  const token=process.env.META_ADS_ACCESS_TOKEN;if(!token)return{state:"unavailable"};
  try{
    const url=new URL(`https://graph.facebook.com/v23.0/act_${META_REPORT_ACCOUNT}/insights`);
    url.searchParams.set("level","ad");url.searchParams.set("date_preset",days===7?"last_7d":"last_30d");url.searchParams.set("limit","100");
    url.searchParams.set("fields","ad_id,ad_name,campaign_name,adset_name,spend,impressions,reach,clicks,actions");
    const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!r.ok)return{state:"unavailable"};const data=await r.json();
    if(!Array.isArray(data.data)||data.data.some((row:AdInsight)=>typeof row.ad_id!=="string"))return{state:"unavailable"};
    return{state:"ready",rows:data.data,truncated:Boolean(data.paging?.next)};
  }catch{return{state:"unavailable"};}
}
