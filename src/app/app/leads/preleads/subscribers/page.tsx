import { prisma } from "@/lib/db";
import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { trafficDays, trafficWindow } from "@/lib/website-traffic-report";
import { PreleadsTabs } from "@/components/saas/preleads-tabs";
import styles from "@/components/saas/website-traffic-dashboard.module.css";
export const dynamic = "force-dynamic";
export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireBannerAdmin();
  const days=(await searchParams).days==="7"?7:30, now=new Date(), since=trafficWindow(days,now);
  const base="/app/leads/preleads/subscribers";
  let data;
  try {
    const [counts,rows,daily]=await Promise.all([
      prisma.websiteSubscriber.groupBy({by:["status"],_count:true}),
      prisma.websiteSubscriber.findMany({where:{requestedAt:{gte:since,lte:now}},orderBy:{requestedAt:"desc"},take:200,select:{id:true,email:true,name:true,status:true,requestedAt:true,confirmedAt:true}}),
      prisma.$queryRaw<{day:string;views:bigint}[]>`SELECT to_char("requestedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS day, COUNT(*) AS views FROM "WebsiteSubscriber" WHERE "requestedAt">=${since} AND "requestedAt"<=${now} GROUP BY day ORDER BY day`,
    ]);data={counts,rows,daily};
  } catch {return <div className={styles.dashboard}><PreleadsTabs active="subscribers" days={days}/><h1>Subscribers & signups</h1><p className={styles.notice}>Subscriber reporting is unavailable. This does not mean zero subscribers. Please retry after the connection is restored.</p></div>;}
  const amount=(status:string)=>data.counts.find(c=>c.status===status)?._count??0;
  const trend=trafficDays(data.daily,days,now),peak=Math.max(1,...trend.map(d=>d.views));
  const inPeriod=trend.reduce((sum,d)=>sum+d.views,0);
  const time=(d:Date)=>d.toLocaleString("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"short"});
  return <div className={styles.dashboard}><PreleadsTabs active="subscribers" days={days}/>
    <header className={styles.header}><div><p className={styles.muted}>CRM / Preleads · OWNED AUDIENCE</p><h1>Subscribers & signups</h1><p className={styles.muted}>Monthly digest + new-feature emails. Newsletter signups—not Workspace account registrations.</p></div><nav className={styles.actions} aria-label="Reporting period">{[7,30].map(n=><a key={n} href={`${base}?days=${n}`} aria-current={days===n}>{n} days</a>)}<a href={`${base}?days=${days}`}>Refresh</a></nav></header>
    <div className={styles.metrics}>{[{label:"Confirmed subscribers",value:amount("ACTIVE"),note:"Current active list · all retained records"},{label:"Awaiting confirmation",value:amount("PENDING"),note:"Not eligible for update emails"},{label:"Unsubscribed",value:amount("UNSUBSCRIBED"),note:"Excluded from future updates"},{label:"Signup requests",value:inPeriod,note:`Last ${days} days, including today · retained latest requests`}].map(m=><section className={styles.card} key={m.label}><h2>{m.label}</h2><strong>{m.value.toLocaleString("en-IN")}</strong><p className={styles.muted}>{m.note}</p></section>)}</div>
    <div className={styles.columns}><section className={styles.panel}><h2>Signup activity</h2><p className={styles.muted}>Latest request date per retained email address · IST</p><div className={styles.chart} role="img" aria-label={trend.map(d=>`${d.day}: ${d.views} requests`).join("; ")}>{trend.map(d=><div className={styles.bar} key={d.day} style={{height:`${d.views/peak*100}%`}} title={`${d.day}: ${d.views}`}/>)}</div><div className={styles.axis}><span>{trend[0].day}</span><span>{trend.at(-1)?.day}</span></div><details><summary>View daily details</summary><div className={styles.table}><table><thead><tr><th>Date</th><th>Requests</th></tr></thead><tbody>{trend.map(d=><tr key={d.day}><td>{d.day}</td><td>{d.views}</td></tr>)}</tbody></table></div></details></section><section className={styles.panel}><h2>A consent-first audience</h2><p className={styles.muted}>Only people who submit the website form and confirm their email become active subscribers. Analytics consent does not subscribe anyone.</p><p className={styles.muted}>No bulk newsletter, sales calls or WhatsApp campaign is enabled here. Pending, unconfirmed requests expire from the retained list after 30 days when cleanup runs; this is not a lifetime signup counter.</p><a href="https://sheetomatic.com/#product-updates" target="_blank" rel="noopener noreferrer">Open website subscription form ↗</a></section></div>
    <section className={styles.panel}><h2>Recent signups</h2><p className={styles.muted}>Latest 200 matching requests · last {days} days. Contact information is visible only to website administrators.</p>{data.rows.length?<div className={styles.table}><table><thead><tr><th>Name / email</th><th>Status</th><th>Requested (IST)</th><th>Confirmed (IST)</th></tr></thead><tbody>{data.rows.map(r=><tr key={r.id}><td><strong>{r.name||"Name not provided"}</strong><br/>{r.email}</td><td>{r.status==="ACTIVE"?"Confirmed":r.status==="PENDING"?"Pending confirmation":"Unsubscribed"}</td><td>{time(r.requestedAt)}</td><td>{r.confirmedAt?time(r.confirmedAt):"—"}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>No signup requests recorded in this period yet.</p>}</section>
    <footer className={styles.footer}>Updated {time(now)} IST. Resubscription updates the latest request date; historical signup attempts are not counted separately.</footer>
  </div>;
}
