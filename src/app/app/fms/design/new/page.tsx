import Link from "next/link";
import { FmsFlowchartBuilder } from "@/components/saas/fms-flowchart-builder";
import { FmsWorkflowTemplatePicker } from "@/components/saas/fms-workflow-template-picker";
import { requireSession } from "@/lib/require-session";
import { canSubmitFmsFlow } from "@/lib/fms/access";
import {
  getFmsWorkflowTemplate,
  templateToFlowchartSteps,
} from "@/lib/fms/workflow-templates";
import { getFmsAiStarter } from "@/lib/fms/ai-starters";
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
  const template = templateId ? getFmsWorkflowTemplate(templateId) : null;
  const starter = !template && starterId ? getFmsAiStarter(starterId) : null;
  const members = await listAssignableMembers(user.organizationId);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-flow-design-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/fms/setup" className="ws-fms-jf-back">
          Back to setup
        </Link>
      </div>
      {!template && !starter ? <FmsWorkflowTemplatePicker /> : null}
      <FmsFlowchartBuilder
        members={members}
        mode="create"
        initialName={template?.name ?? starter?.label ?? ""}
        initialDescription={template?.description ?? starter?.summary ?? ""}
        initialSteps={template ? templateToFlowchartSteps(template) : []}
        initialAiPrompt={starter?.prompt ?? ""}
      />
    </div>
  );
}
