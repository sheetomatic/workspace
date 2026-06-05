import { requireAiSession } from "@/lib/require-session";
import { AiSupportHubPanel } from "@/components/saas/ai-support-hub-panel";
import { getSupportHubQueue } from "@/lib/ai-module-data";

export default async function SheetomaticAiTicketsPage() {
  const user = await requireAiSession();
  const data = await getSupportHubQueue(user.organizationId);

  return (
    <div className="saas-page">
      <AiSupportHubPanel data={data} />
    </div>
  );
}
