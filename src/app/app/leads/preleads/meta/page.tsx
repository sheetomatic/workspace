import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { metaAdsReport } from "@/lib/meta-ads-report";
import { MetaDashboard } from "@/components/saas/meta-dashboard";
import { metaAdsBreakdown } from "@/lib/meta-ads-breakdown";
export const dynamic = "force-dynamic";
export default async function MetaStatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireBannerAdmin();
  const days = (await searchParams).days === "7" ? 7 : 30;
  const [report,ads]=await Promise.all([metaAdsReport(days),metaAdsBreakdown(days)]);
  return <MetaDashboard report={report} ads={ads} days={days} />;
}
