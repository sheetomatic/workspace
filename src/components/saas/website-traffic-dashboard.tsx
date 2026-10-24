import { prisma } from "@/lib/db";
import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { trafficDays, trafficWindow } from "@/lib/website-traffic-report";
import styles from "./website-traffic-dashboard.module.css";

export async function WebsiteTrafficDashboard({ days, basePath }: { days: number; basePath: string }) {
  await requireBannerAdmin();
  const now = new Date();
  const since = trafficWindow(days, now);
  const where = { createdAt: { gte: since, lte: now } };
  let data;
  try {
    const [views, totals, pages, sources, daily, recent] = await Promise.all([
      prisma.websitePageView.count({ where }),
      prisma.$queryRaw<{ visitors: bigint; pages: bigint }[]>`SELECT COUNT(DISTINCT "visitorHash") AS visitors, COUNT(DISTINCT path) AS pages FROM "WebsitePageView" WHERE "createdAt" >= ${since} AND "createdAt" <= ${now}`,
      prisma.websitePageView.groupBy({ by: ["path"], where, _count: true, orderBy: { _count: { path: "desc" } }, take: 20 }),
      prisma.websitePageView.groupBy({ by: ["source"], where, _count: true, orderBy: { _count: { source: "desc" } } }),
      prisma.$queryRaw<{ day: string; views: bigint }[]>`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS day, COUNT(*) AS views FROM "WebsitePageView" WHERE "createdAt" >= ${since} AND "createdAt" <= ${now} GROUP BY day ORDER BY day`,
      prisma.websitePageView.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, path: true, source: true, createdAt: true } }),
    ]);
    data = { views, visitors: Number(totals[0]?.visitors ?? 0), pageCount: Number(totals[0]?.pages ?? 0), pages, sources, daily, recent };
  } catch {
    return <div className={styles.dashboard}><h1>CRM · Preleads</h1><div className={styles.notice}>Website traffic could not be loaded. This is a reporting error, not zero traffic. <a href={basePath}>Retry</a></div></div>;
  }
  const trend = trafficDays(data.daily, days, now);
  const peak = Math.max(1, ...trend.map(day => day.views));
  const time = (date: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(date);
  const share = (count: number) => data.views ? Math.round(count / data.views * 100) : 0;
  const metrics = [
    { label: "Page views", value: data.views, note: "Consented public website visits" },
    { label: "Approx. visitor-days", value: data.visitors, note: "Same browser on two days counts twice" },
    { label: "Pages visited", value: data.pageCount, note: "Distinct public page paths" },
    { label: "Traffic sources", value: data.sources.length, note: "Recorded referral categories" },
  ];
  return <div className={styles.dashboard}>
    <header className={styles.header}><div><p className={styles.muted}>CRM / Preleads</p><h1>Website traffic dashboard</h1><p className={styles.muted}>Understand the visits before an enquiry. Last {days} days, including today · IST</p></div><nav className={styles.actions} aria-label="Reporting period"><a href={`${basePath}?days=7`} aria-current={days === 7}>7 days</a><a href={`${basePath}?days=30`} aria-current={days === 30}>30 days</a><a href={`${basePath}?days=${days}`}>Refresh</a></nav></header>
    <div className={styles.metrics}>{metrics.map(metric => <section className={styles.card} key={metric.label}><h2>{metric.label}</h2><strong>{metric.value.toLocaleString("en-IN")}</strong><p className={styles.muted}>{metric.note}</p></section>)}</div>
    {!data.views && <div className={styles.notice}><strong>No consented visits recorded in this period yet.</strong><p>Collection starts after visitors allow analytics on the public website. Declined consent, blocked analytics and Workspace/CRM activity are excluded. Historical visits cannot be reconstructed.</p><a href="https://sheetomatic.com" target="_blank" rel="noopener noreferrer">Open public website ↗</a></div>}
    <div className={styles.columns}>
      <section className={styles.panel}><h2>Daily page views</h2><p className={styles.muted}>Daily totals in Indian Standard Time</p><div className={styles.chart} role="img" aria-label={trend.map(day => `${day.day}: ${day.views} views`).join("; ")}>{trend.map(day => <div className={styles.bar} key={day.day} style={{ height: `${day.views / peak * 100}%` }} title={`${day.day}: ${day.views} views`} />)}</div><div className={styles.axis}><span>{trend[0].day}</span><span>{trend.at(-1)?.day}</span></div><details><summary>View daily details</summary><div className={styles.table}><table><thead><tr><th>Date (IST)</th><th>Page views</th></tr></thead><tbody>{trend.map(day => <tr key={day.day}><td>{day.day}</td><td>{day.views}</td></tr>)}</tbody></table></div></details></section>
      <section className={styles.panel}><h2>Traffic sources</h2>{data.sources.length ? data.sources.map(row => <div className={styles.source} key={row.source}><p><span>{row.source === "Direct" ? "Direct / unknown" : row.source}</span><strong>{row._count} · {share(row._count)}%</strong></p><div className={styles.track}><span style={{ width: `${share(row._count)}%` }} /></div></div>) : <p className={styles.empty}>Referral categories will appear here after visits are recorded.</p>}</section>
    </div>
    <section className={styles.panel}><h2>Top pages</h2>{data.pages.length ? <div className={styles.table}><table><thead><tr><th>Page</th><th>Views</th><th>Share of traffic</th></tr></thead><tbody>{data.pages.map(row => <tr key={row.path}><td>{row.path}</td><td>{row._count}</td><td>{share(row._count)}%</td></tr>)}</tbody></table></div> : <p className={styles.empty}>Your most visited website pages will appear here.</p>}</section>
    <section className={styles.panel}><h2>Recent visit details</h2><p className={styles.muted}>Latest 50 page views in the selected period. No visitor names, phone numbers or private browsing identifiers are shown.</p>{data.recent.length ? <div className={styles.table}><table><thead><tr><th>Time (IST)</th><th>Page</th><th>Source</th></tr></thead><tbody>{data.recent.map(row => <tr key={row.id}><td>{time(row.createdAt)}</td><td>{row.path}</td><td>{row.source === "Direct" ? "Direct / unknown" : row.source}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>No visits to display yet.</p>}</section>
    <aside className={styles.notice}><strong>Visits are not identified leads.</strong><p>This Preleads view reports anonymous website interest. Names and contact details belong in CRM only when someone submits them; visits are not automatically converted into people or contacted.</p><a href="/app/leads">Open identified CRM leads →</a></aside>
    <footer className={styles.footer}>Updated {time(now)} IST · Analytics retained for up to 30 days. Counts exclude Workspace and CRM.<br />Website traffic is separate from Meta Ads spend, leads and conversions. Pixel 2673554139515459 is consent-controlled; this report is not an Ads Manager report.</footer>
  </div>;
}
