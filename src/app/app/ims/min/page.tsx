import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsMovementForm } from "@/components/ims/ims-movement-form";
import { requireSession } from "@/lib/require-session";
import { getUsableQtyMap, listImsItems } from "@/lib/ims/ims-store";

export default async function ImsMinPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, usableMap] = await Promise.all([
    listImsItems(user.organizationId),
    getUsableQtyMap(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="MIN — material issue"
        description="Issue stock to production or site. Usable balance is checked before issue."
        actions={
          <Link href="/app/ims/movements?type=ISSUE_TO_PRODUCTION" className="ws-btn ws-btn-ghost">
            Issue history
          </Link>
        }
      />

      <section className="ws-ims-panel">
        <ImsMovementForm
          items={items}
          movementType="ISSUE_TO_PRODUCTION"
          usableMap={usableMap}
        />
      </section>
    </div>
  );
}
