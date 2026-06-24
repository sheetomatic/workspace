import { PageHeader } from "@/components/saas/page-header";
import { ImsMovementForm } from "@/components/ims/ims-movement-form";
import { recordMovementAction } from "@/app/app/ims/actions";
import { requireSession } from "@/lib/require-session";
import { listImsItems } from "@/lib/ims/ims-store";

export default async function ImsMovePage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const items = await listImsItems(user.organizationId);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Stock movements"
        description="RM In ? Issue to production ? FG In ? FG Out. Optional QC prompt on receipt when item policy is Optional."
      />

      <div className="ws-ims-move-grid">
        <ImsMovementForm
          items={items}
          movementType="RM_IN"
          action={recordMovementAction}
        />
        <ImsMovementForm
          items={items}
          movementType="ISSUE_TO_PRODUCTION"
          action={recordMovementAction}
        />
        <ImsMovementForm
          items={items}
          movementType="FG_IN"
          action={recordMovementAction}
        />
        <ImsMovementForm
          items={items}
          movementType="FG_OUT"
          action={recordMovementAction}
        />
      </div>
    </div>
  );
}
