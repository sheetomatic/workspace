"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronDown, BarChart3, Eye, MousePointer2, RefreshCw, ShieldCheck, Users, Wallet } from "lucide-react";
import type { metaAdsReport } from "@/lib/meta-ads-report";
import styles from "./meta-dashboard.module.css";
import { PreleadsTabs } from "./preleads-tabs";
import type { AdsBreakdown } from "@/lib/meta-ads-breakdown";
type Report = Awaited<ReturnType<typeof metaAdsReport>>;
const number = (raw: string | undefined) => raw !== undefined && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null;
const count = (n: number | null) => n === null ? "—" : n.toLocaleString("en-IN");
const money = (n: number | null) => n === null ? "—" : n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const actionLabels: Record<string, string> = { link_click: "Link clicks", post_engagement: "Post engagements", page_engagement: "Page engagements", lead: "Leads reported by Meta", "onsite_conversion.lead_grouped": "On-Meta leads" };
export function MetaDashboard({ report, days, ads }: { report: Report; days: 7 | 30; ads?: AdsBreakdown }) {
  const [metric, setMetric] = useState<"impressions" | "spend" | "clicks">("impressions");
  const row = report.state === "ready" ? report.rows[0] : undefined;
  const daily = report.state === "ready" ? report.daily : null;
  const impressions = number(row?.impressions), clicks = number(row?.clicks), spend = number(row?.spend);
  const ctr = impressions && clicks !== null ? `${(clicks / impressions * 100).toFixed(2)}%` : "—";
  const cpc = clicks && spend !== null ? money(spend / clicks) : "—";
  const points = (daily ?? []).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date_start)).sort((a,b) => a.date_start.localeCompare(b.date_start));
  const max = Math.max(1, ...points.map(p => number(p[metric]) ?? 0));
  const actions = row?.actions ?? [];
  const actionMax = Math.max(1, ...actions.map(a => number(a.value) ?? 0));
  const cards = [
    { title: "Ad spend", value: money(spend), note: "Media cost · excluding taxes & fees", icon: Wallet, tone: "teal" },
    { title: "Impressions", value: count(impressions), note: "Total times your ads were shown", icon: Eye, tone: "blue" },
    { title: "People reached", value: count(number(row?.reach)), note: "Unique reach for the selected period", icon: Users, tone: "purple" },
    { title: "All clicks", value: count(clicks), note: "Includes clicks beyond your links", icon: MousePointer2, tone: "amber" },
  ];
  return <div className={styles.canvas}>
    <PreleadsTabs active="meta" days={days}/>
    <header className={styles.header}><div><Link className={styles.back} href="/app/leads/preleads"><ArrowLeft size={15}/> CRM / Preleads</Link><div className={styles.eyebrow}>MARKETING INTELLIGENCE</div><h1>Meta Ads overview<span className={styles.badge}>Read-only</span></h1><p>Your advertising performance, in one clear view.</p></div><div className={styles.toolbar}><nav className={styles.period} aria-label="Reporting period">{([7,30] as const).map(n=><Link key={n} href={`?days=${n}`} aria-current={days === n ? "page" : undefined}>{n} days</Link>)}</nav><a className={styles.refresh} href={`?days=${days}`} aria-label="Refresh Meta statistics"><RefreshCw size={17}/></a></div></header>
    <div className={styles.account}><span className={styles.accountMark}><BarChart3 size={22}/></span><div><strong>SheetomaticAd</strong><span>Ad account · 1289822315977891</span></div><div className={styles.range}>{row ? `${date(row.date_start)} – ${date(row.date_stop)}, ${row.date_stop.slice(0,4)}` : `Last ${days} completed days`}<span>Asia/Calcutta · excludes today</span></div></div>
    {report.state !== "ready" || !row ? <section className={styles.empty}><BarChart3 size={32}/><h2>{report.state === "ready" ? "No activity for this period" : "Reporting is unavailable"}</h2><p>{report.state === "unconfigured" ? "The server-side Meta reporting connection needs configuration." : report.state === "unavailable" ? "We couldn’t retrieve Meta’s report. Refresh to retry; unavailable data does not mean zero activity." : "Meta returned no reporting rows. Choose another period to check for activity."}</p></section> : <>
      <section className={styles.metrics} aria-label="Performance summary">{cards.map(card=><article className={styles.card} key={card.title}><div className={styles.cardTop}><h2>{card.title}</h2><span className={styles[card.tone]}><card.icon size={19}/></span></div><strong>{card.value}</strong><p>{card.note}</p></article>)}</section>
      <div className={styles.chartGrid}><section className={styles.panel}><div className={styles.panelHead}><div><h2>Performance over time</h2><p>Daily activity reported by Meta</p></div><div className={styles.tabs} role="group" aria-label="Chart metric">{(["impressions","spend","clicks"] as const).map(m=><button key={m} aria-pressed={metric===m} onClick={()=>setMetric(m)}>{m}</button>)}</div></div>
        {daily === null ? <p className={styles.chartEmpty}>Daily details could not be loaded. Summary totals above are still available.</p> : !points.length ? <p className={styles.chartEmpty}>No daily activity was returned for this period.</p> : <><div className={styles.chart} role="img" aria-label={`Daily ${metric}. Exact values are available in the daily breakdown below.`}><div className={styles.scale}><span>{metric === "spend" ? money(max) : count(max)}</span><span>{metric === "spend" ? money(max/2) : count(Math.round(max/2))}</span><span>0</span></div><div className={styles.plot}>{points.map(p=><div className={styles.barSlot} key={p.date_start}><div className={styles.bar} style={{height:`${(number(p[metric])??0)/max*100}%`}} title={`${date(p.date_start)} · ${metric === "spend" ? money(number(p[metric])) : count(number(p[metric]))}`}/></div>)}</div></div><div className={styles.axis}><span>{date(points[0].date_start)}</span><span>{date(points[points.length-1].date_start)}</span></div><p className={styles.chartNote}>Only dates returned by Meta are plotted; missing dates are not invented as zeroes.</p><details className={styles.details}><summary>View daily breakdown</summary><div className={styles.tableWrap}><table><thead><tr><th>Date</th><th>Impressions</th><th>Spend</th><th>Clicks</th></tr></thead><tbody>{points.map(p=><tr key={p.date_start}><td>{date(p.date_start)}</td><td>{count(number(p.impressions))}</td><td>{money(number(p.spend))}</td><td>{count(number(p.clicks))}</td></tr>)}</tbody></table></div></details></>}
      </section><section className={styles.panel}>
        <details className={styles.audienceDetails}>
          <summary>
            <span><span className={styles.audienceTitle}>Audience actions</span><span className={styles.audienceHint}>View action details and reporting notes</span></span>
            <ChevronDown size={21} aria-hidden="true"/>
          </summary>
          <div className={styles.audienceBody}>
            <h2>Audience action details</h2>
            <p>Aggregate activity reported by Meta for {date(row.date_start)} – {date(row.date_stop)}, {row.date_stop.slice(0,4)}. These are actions, not a list of identifiable visitors.</p>
            {actions.length ? <div className={styles.tableWrap}><table><caption>Exact action counts for the selected period</caption><thead><tr><th scope="col">Action / Meta field</th><th scope="col">Count</th></tr></thead><tbody>{actions.map(a => <tr key={a.action_type}><td>{actionLabels[a.action_type] ?? a.action_type.replaceAll("_", " ")}<br/><code>{a.action_type}</code></td><td>{count(number(a.value))}</td></tr>)}</tbody></table></div> : <p>No action details were returned for this period.</p>}
            <p>Link clicks are not confirmed website visits. Post and page engagements may include the same interaction. Do not add these categories together as unique people or leads.</p>
            <p>Meta does not provide individual names, phone numbers or email addresses in this aggregate report. Website subscribers and submitted leads are separate records.</p>
          </div>
        </details>
        {actions.length ? actions.map(a=><div className={styles.action} key={a.action_type}><div><span>{actionLabels[a.action_type] ?? a.action_type.replaceAll("_"," ")}</span><strong>{count(number(a.value))}</strong></div><div className={styles.actionTrack}><span style={{width:`${(number(a.value)??0)/actionMax*100}%`}}/></div></div>) : <p className={styles.chartEmpty}>No actions were reported.</p>}<p className={styles.actionNote}>These categories can overlap. They are not added together as unique leads.</p></section></div>
      <section className={styles.efficiency}><div><span>Click-through rate</span><strong>{ctr}</strong><p>All clicks ÷ impressions</p></div><div><span>Cost per click</span><strong>{cpc}</strong><p>Ad spend ÷ all clicks</p></div><div className={styles.context}><ShieldCheck size={22}/><p>Connected directly to Meta Insights.<br/>Your budgets and ads are never changed here.</p></div></section>
    </>}
    <section className={styles.panel} style={{marginTop:22}}><div className={styles.panelHead}><div><h2>Ad-by-ad performance</h2><p>Compare individual ads across campaigns. Summary cards above cover the whole account.</p></div></div>
      {!ads||ads.state==="unavailable"?<p className={styles.chartEmpty}>Ad-level details are unavailable. This does not mean there are no running ads.</p>:!ads.rows.length?<p className={styles.chartEmpty}>No ads returned reporting activity in this period.</p>:<><p className={styles.chartNote}>{ads.truncated?"Showing the first 100 returned ads; this is a partial list. Account totals include all ads.":`${ads.rows.length} ads with reported activity.`} This is performance during the selected dates—not a current delivery-status list. Newly active ads may not have reporting yet.</p><div className={styles.tableWrap}><table><thead><tr><th>Ad / campaign</th><th>Spend</th><th>Impressions</th><th>Reach</th><th>Clicks</th><th>CTR</th></tr></thead><tbody>{[...ads.rows].sort((a,b)=>(number(b.spend)??0)-(number(a.spend)??0)).map(ad=><tr key={ad.ad_id}><td><strong>{ad.ad_name||ad.ad_id}</strong><br/>{ad.campaign_name||"Campaign not reported"}<br/><small>{ad.adset_name||""} · {ad.ad_id}</small></td><td>{money(number(ad.spend))}</td><td>{count(number(ad.impressions))}</td><td>{count(number(ad.reach))}</td><td>{count(number(ad.clicks))}</td><td>{number(ad.impressions)&&number(ad.clicks)!==null?`${(Number(ad.clicks)/Number(ad.impressions)*100).toFixed(2)}%`:"—"}</td></tr>)}</tbody></table></div><p className={styles.chartNote}>One person may see multiple ads. Do not add ad-level reach to calculate account reach.</p></>}
    </section>
    <footer className={styles.footer}><ShieldCheck size={16}/><span>Meta Ads data is separate from website visits and subscribers. Reach is the period’s unique estimate—not a sum of daily reach. No billing taxes are included in ad spend.</span></footer>
  </div>;
}
