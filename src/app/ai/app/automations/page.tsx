import { requireSession } from "@/lib/require-session";
import { AiWorkflowsPanel } from "@/components/saas/ai-workflows-panel";
import { getWorkflowStatuses } from "@/lib/ai-module-data";

export default async function SheetomaticAiAutomationsPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const data = await getWorkflowStatuses(user.organizationId);

  return (
    <div className="saas-page">
      <AiWorkflowsPanel data={data} />
    </div>
  );
}
