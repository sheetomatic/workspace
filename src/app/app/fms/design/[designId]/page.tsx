import Link from "next/link";
import { notFound } from "next/navigation";
import { FmsDesignLaunchPanel } from "@/components/saas/fms-design-launch-panel";
import { FmsFlowchartBuilder } from "@/components/saas/fms-flowchart-builder";
import { requireSession } from "@/lib/require-session";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import { parseFlowchartSteps } from "@/lib/fms/flow-design";
import { getFmsFlowDesign } from "@/lib/fms/queries";
import { listAssignableMembers } from "@/lib/tasks";

type PageProps = {
  params: Promise<{ designId: string }>;
  searchParams: Promise<{ approved?: string }>;
};

export default async function FmsFlowDesignPage({ params, searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { designId } = await params;
  const { approved } = await searchParams;
  const design = await getFmsFlowDesign(designId, user.organizationId);

  if (!design) {
    notFound();
  }

  const canEdit = canSubmitFmsFlow(user.role);
  const canApprove = canApproveFmsFlow(user.role);
  const members =
    canEdit || canApprove
      ? await listAssignableMembers(user.organizationId)
      : [];

  if (
    design.status === "DRAFT" &&
    design.createdById !== user.id &&
    !canEdit
  ) {
    notFound();
  }

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-flow-design-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/fms" className="ws-fms-jf-back">
          Back to FMS
        </Link>
      </div>
      <FmsFlowchartBuilder
        designId={design.id}
        initialName={design.name}
        initialDescription={design.description ?? ""}
        initialSteps={parseFlowchartSteps(design.steps)}
        initialHolidayDates={design.holidayDates}
        initialAlertConfig={design.alertConfig}
        initialStatus={design.status}
        members={members}
        mode="edit"
        canApprove={canApprove}
        reviewNote={design.reviewNote}
        linkedFormId={design.formId}
        linkedFormName={design.form?.name}
        formNeedsSetup={(design.form?._count.fields ?? 0) < 3}
        justApproved={approved === "1"}
      />
    </div>
  );
}
