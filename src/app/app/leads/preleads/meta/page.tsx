import Link from "next/link";
import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { metaAdsReport, META_REPORT_ACCOUNT } from "@/lib/meta-ads-report";
export const dynamic = "force-dynamic";
export default async function MetaStatsPage() {
  await requireBannerAdmin();
  const report = await metaAdsReport();
  return <div className="saas-page"><h1>Meta Ads statistics</h1><p>SheetomaticAd · Account {META_REPORT_ACCOUNT} · Last 30 completed days · Asia/Calcutta</p><Link href="/app/leads/preleads">← Website traffic / Preleads</Link>
    <section className="saas-panel">
      {report.state === "unconfigured" ? <p>Meta reporting is not connected in this deployment. An administrator must securely configure the server-side META_ADS_ACCESS_TOKEN with access to this ad account.</p> : report.state === "unavailable" ? <p>Meta reporting is temporarily unavailable. Check account access or token expiry and refresh. This does not mean zero activity.</p> : report.rows.length === 0 ? <p>Meta returned no reporting activity for this period.</p> : report.rows.map((row, i) => <div key={i}><h2>{row.account_name || "SheetomaticAd"}</h2><p>{row.date_start} — {row.date_stop}</p><dl>{[["Ad spend (INR, excluding billing taxes/fees)", row.spend], ["Impressions", row.impressions], ["Reach", row.reach], ["Clicks (all)", row.clicks]].map(([label, value]) => <div key={label} style={{ padding: "12px 0" }}><dt>{label}</dt><dd style={{ fontSize: 24, fontWeight: 700 }}>{value ?? "Not reported"}</dd></div>)}</dl><h3>Actions reported by Meta</h3>{row.actions?.length ? <ul>{row.actions.map(action => <li key={action.action_type}>{action.action_type}: {action.value}</li>)}</ul> : <p>No actions reported.</p>}</div>)}
    </section><p>Read-only account reporting. Actions may overlap and are not summed as leads. This is separate from consenting website visits and email subscribers. No budget or delivery changes are made here.</p></div>;
}
