import { prisma } from "@/lib/db";
let lastCleanup = 0;
/** Only analytics records/buckets; never CRM, billing or other rate-limit data. */
export async function pruneWebsiteAnalytics(now = Date.now()) {
  if (now - lastCleanup < 3600000) return;
  await prisma.websitePageView.deleteMany({where:{createdAt:{lt:new Date(now-30*86400000)}}});
  await prisma.rateLimitBucket.deleteMany({where:{resetAt:{lt:new Date(now-2*86400000)},OR:[{key:{startsWith:"website-traffic:"}},{key:{startsWith:"traffic-network:"}}]}});
  lastCleanup=now;
}
