import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { FmsLicensedKitsPanel } from "@/components/saas/fms-licensed-kits-panel";
import { requireSession } from "@/lib/require-session";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import { hasMinimumRole } from "@/lib/permissions";
import { findFmsTemplateByPresetId } from "@/lib/fms/provision-preset";
import { listShippableFmsKits } from "@/lib/addons/licensed-kits";
import { listOrganizationKitLicenses } from "@/lib/addons/kit-license";

export default async function FmsLicensedKitsPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  const canDesign = canSubmitFmsFlow(user.role);
  const isOwner = canApproveFmsFlow(user.role);
  if (!canDesign && !isOwner) {
    redirect("/app/fms/my-stops");
  }

  const kits = listShippableFmsKits();
  const licenses = await listOrganizationKitLicenses(user.organizationId);
  const installedPresetIds: string[] = [];
  for (const kit of kits) {
    if (!kit.presetId) continue;
    const existing = await findFmsTemplateByPresetId(
      user.organizationId,
      kit.presetId,
    );
    if (existing) installedPresetIds.push(kit.presetId);
  }

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Licensed kits"
        description="Right-to-use FMS packs for this workspace. Pay on the invoice, then install. Not a custom job."
        actions={
          <Link href="/app/fms/setup" className="btn-secondary btn-sm">
            Setup
          </Link>
        }
      />
      <FmsLicensedKitsPanel
        kits={kits}
        licenses={licenses.map((row) => ({
          kitKey: row.kitKey,
          status: row.status,
          billingPeriod: row.billingPeriod,
          renewalAt: row.renewalAt ? row.renewalAt.toISOString() : null,
        }))}
        installedPresetIds={installedPresetIds}
        canRequest={hasMinimumRole(user.role, "ADMIN")}
        canInstall={hasMinimumRole(user.role, "MANAGER")}
      />
    </div>
  );
}
