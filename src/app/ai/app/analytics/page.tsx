import { requireAiSession } from "@/lib/require-session";
import { AiAnalyticsPanel } from "@/components/saas/ai-analytics-panel";
import { getExtendedAnalytics } from "@/lib/ai-module-data";

export default async function SheetomaticAiAnalyticsPage() {
  const user = await requireAiSession();
  const data = await getExtendedAnalytics(user.organizationId);

  return (
    <div className="saas-page">
      <AiAnalyticsPanel data={data} />
    </div>
  );
}
