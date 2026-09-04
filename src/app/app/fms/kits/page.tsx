import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { FmsLicensedKitsPanel } from "@/components/saas/fms-licensed-kits-panel";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listShippableShopKits } from "@/lib/addons/licensed-kits";
import { listOrganizationKitLicenses } from "@/lib/addons/kit-license";

export default async function FmsLicensedKitsPage() {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/mobile-shop");
  }

  const kits = listShippableShopKits();
  const licenses = await listOrganizationKitLicenses(user.organizationId);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Licensed kits"
        description="Mobile shop app — counter buttons, not a spreadsheet. Pay the invoice, then open the shop."
        actions={
          <Link href="/app/mobile-shop" className="btn-secondary btn-sm">
            Mobile shop
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
        canRequest={hasMinimumRole(user.role, "ADMIN")}
      />
    </div>
  );
}
