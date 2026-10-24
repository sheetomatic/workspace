import { prisma } from "@/lib/db";
import { requireBannerAdmin } from "@/lib/marketing-banner-store";

export default async function WebsiteTrafficPage() {
  await requireBannerAdmin();
  // eslint-disable-next-line react-hooks/purity -- authenticated server request uses a rolling reporting window
  const since=new Date(Date.now()-30*86400000);
  let data;
  try {
    const [views,visitors,pages,sources,daily]=await Promise.all([
      prisma.websitePageView.count({where:{createdAt:{gte:since}}}),
      prisma.$queryRaw<{count:bigint}[]>`SELECT COUNT(DISTINCT "visitorHash") AS count FROM "WebsitePageView" WHERE "createdAt" >= ${since}`,
      prisma.websitePageView.groupBy({by:["path"],where:{createdAt:{gte:since}},_count:true,orderBy:{_count:{path:"desc"}},take:20}),
      prisma.websitePageView.groupBy({by:["source"],where:{createdAt:{gte:since}},_count:true}),
      prisma.$queryRaw<{day:string;views:bigint}[]>`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS day, COUNT(*) AS views FROM "WebsitePageView" WHERE "createdAt" >= ${since} GROUP BY day ORDER BY day DESC LIMIT 31`,
    ]);data={views,visitors:Number(visitors[0]?.count ?? 0),pages,sources,daily};
  }catch{return <div className="saas-page"><h1>Website Traffic</h1><p>Traffic storage is not available yet. No historical traffic has been imported.</p></div>;}
  return <div className="saas-page"><h1>Website Traffic</h1><p>Last 30 days · consenting browsers only · daily totals in IST. Excludes Workspace and CRM. Not Meta Ads spend or conversions.</p>
    <section className="saas-panel"><h2>{data.views} page views</h2><p>{data.visitors} approximate visitor-days (the same browser on different days counts separately).</p></section>
    {!data.views && <p>No traffic recorded yet. Collection begins after deployment and visitor consent.</p>}
    <section className="saas-panel"><h2>Top pages</h2>{data.pages.map(row=><p key={row.path}>{row.path}: {row._count}</p>)}</section>
    <section className="saas-panel"><h2>Traffic sources</h2>{data.sources.map(row=><p key={row.source}>{row.source}: {row._count}</p>)}</section>
    <section className="saas-panel"><h2>Daily trend</h2>{data.daily.map(row=><p key={row.day}>{row.day}: {String(row.views)}</p>)}</section>
  </div>;
}
