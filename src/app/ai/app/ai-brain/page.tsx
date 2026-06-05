import { requireSession } from "@/lib/require-session";
import { AiAgentsPanel } from "@/components/saas/ai-agents-panel";
import { getAiAgentsOverview } from "@/lib/ai-module-data";

export default async function SheetomaticAiBrainPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const data = await getAiAgentsOverview(user.organizationId);

  return (
    <div className="saas-page">
      <AiAgentsPanel data={data} />
    </div>
  );
}
