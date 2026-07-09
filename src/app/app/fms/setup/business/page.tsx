import Link from "next/link";
import { redirect } from "next/navigation";
import { FmsBusinessSetupWizard } from "@/components/saas/fms-business-setup-wizard";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";

export default async function FmsBusinessSetupPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!canSubmitFmsFlow(user.role) && !canApproveFmsFlow(user.role)) {
    redirect("/app/fms/my-stops");
  }

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Business setup"
        description="Tell us your business type and industry — we set up each process as its own FMS (Leads FMS, PO FMS, Dispatch FMS…) customized to how you work."
        actions={
          <Link href="/app/fms/setup" className="btn-secondary btn-sm">
            Advanced setup
          </Link>
        }
      />
      <FmsBusinessSetupWizard />
    </div>
  );
}
