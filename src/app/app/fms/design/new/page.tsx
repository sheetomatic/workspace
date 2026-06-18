import Link from "next/link";
import { FmsNewFlowDesignShell } from "@/components/saas/fms-new-flow-design-shell";
import { requireSession } from "@/lib/require-session";
import { canSubmitFmsFlow } from "@/lib/fms/access";
import { listAssignableMembers } from "@/lib/tasks";

type PageProps = {
  searchParams: Promise<{ template?: string; starter?: string }>;
};

export default async function NewFmsFlowDesignPage({ searchParams }: PageProps) {
  const user = await requireSession("ADMIN", { module: "FMS" });
  if (!canSubmitFmsFlow(user.role)) {
    return null;
  }

  const { template: templateId, starter: starterId } = await searchParams;
  const members = await listAssignableMembers(user.organizationId);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-flow-design-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/fms/setup" className="ws-fms-jf-back">
          Back to setup
        </Link>
      </div>
      <FmsNewFlowDesignShell
        members={members}
        initialTemplateId={templateId}
        initialStarterId={starterId}
      />
    </div>
  );
}
