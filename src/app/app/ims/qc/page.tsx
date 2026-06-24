import { PageHeader } from "@/components/saas/page-header";
import { resolveQcAction } from "@/app/app/ims/actions";
import { requireSession } from "@/lib/require-session";
import { listPendingQc } from "@/lib/ims/ims-store";
import { formatImsQty } from "@/lib/ims/stock-status";

export default async function ImsQcPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const pending = await listPendingQc(user.organizationId);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="QC queue"
        description="Inspect receipts held in QC pending. Pass moves quantity to usable stock; fail removes it from inventory."
      />

      {pending.length === 0 ? (
        <p className="ws-ims-help">No pending QC inspections.</p>
      ) : (
        <div className="ws-ims-qc-list">
          {pending.map((inspection) => (
            <article key={inspection.id} className="ws-ims-qc-card">
              <div className="ws-ims-qc-head">
                <strong>
                  {inspection.item.code} - {inspection.item.name}
                </strong>
                <span>
                  {formatImsQty(Number(inspection.quantity), inspection.item.uom)} |{" "}
                  {inspection.storeType} store
                </span>
                <span className="ws-ims-meta">
                  Received {inspection.createdAt.toLocaleString("en-IN")}
                </span>
              </div>

              <form action={resolveQcAction} className="ws-ims-form ws-ims-form-inline">
                <input type="hidden" name="inspectionId" value={inspection.id} />
                <label>
                  Notes
                  <input name="notes" type="text" placeholder="Inspection notes" />
                </label>
                <div className="ws-ims-form-actions">
                  <button
                    type="submit"
                    name="decision"
                    value="pass"
                    className="ws-btn-primary"
                  >
                    Pass to usable
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="fail"
                    className="ws-btn-secondary"
                  >
                    Fail (scrap)
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
