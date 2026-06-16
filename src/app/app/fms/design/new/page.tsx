import Link from "next/link";
import { FmsFlowchartBuilder } from "@/components/saas/fms-flowchart-builder";
import { requireSession } from "@/lib/require-session";
import { canSubmitFmsFlow } from "@/lib/fms/access";
import { listAssignableMembers } from "@/lib/tasks";

export default async function NewFmsFlowDesignPage() {
  const user = await requireSession("ADMIN", { module: "FMS" });
  if (!canSubmitFmsFlow(user.role)) {
    return null;
  }

  const members = await listAssignableMembers(user.organizationId);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-jotform-page ws-fms-flow-design-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/fms" className="ws-fms-jf-back">
          Back to FMS
        </Link>
      </div>
      <FmsFlowchartBuilder members={members} mode="create" />
    </div>
  );
}
