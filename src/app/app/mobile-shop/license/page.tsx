import { redirect } from "next/navigation";
import { FmsLicensedKitsPanel } from "@/components/saas/fms-licensed-kits-panel";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listShippableShopKits } from "@/lib/addons/licensed-kits";
import { listOrganizationKitLicenses } from "@/lib/addons/kit-license";

export default async function MobileShopLicensePage() {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF")) {
    redirect("/app");
  }

  const kits = listShippableShopKits();
  const licenses = await listOrganizationKitLicenses(user.organizationId);

  return (
    <section>
      <h1>License</h1>
      <p className="ms-shop-lead">
        This is a shop app, not an FMS. Request, pay the invoice, then open the
        counter.
      </p>
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
    </section>
  );
}
