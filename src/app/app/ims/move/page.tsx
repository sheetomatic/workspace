import { PageHeader } from "@/components/saas/page-header";
import { ImsMovementForm } from "@/components/ims/ims-movement-form";
import { ImsAdjustForm } from "@/components/ims/ims-adjust-form";
import { requireSession } from "@/lib/require-session";
import { getUsableQtyMap, listImsItems } from "@/lib/ims/ims-store";

export default async function ImsMovePage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, usableMap] = await Promise.all([
    listImsItems(user.organizationId),
    getUsableQtyMap(user.organizationId),
  ]);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Stock movements"
        description="RM In, issue to production, FG In, FG Out. Optional QC prompt on receipt when item policy is Optional."
      />

      <div className="ws-ims-move-grid">
        <ImsMovementForm items={items} movementType="RM_IN" usableMap={usableMap} />
        <ImsMovementForm
          items={items}
          movementType="ISSUE_TO_PRODUCTION"
          usableMap={usableMap}
        />
        <ImsMovementForm items={items} movementType="FG_IN" usableMap={usableMap} />
        <ImsMovementForm items={items} movementType="FG_OUT" usableMap={usableMap} />
        <ImsAdjustForm items={items} usableMap={usableMap} />
      </div>
    </div>
  );
}
