import { notFound } from "next/navigation";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import {
  advanceRepairAction,
  repairPartOutAction,
} from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { formatPromisedAt } from "@/lib/mobile-shop/promised-at";
import { getRepair, listMobileShopItems } from "@/lib/mobile-shop/store";

export default async function MobileShopRepairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireMobileShopPage();
  const { id } = await params;
  const repair = await getRepair(user.organizationId, id);
  if (!repair) notFound();
  const parts = (await listMobileShopItems(user.organizationId, "PART")).filter(
    (item) => item.qty > 0,
  );

  return (
    <section>
      <h1>{repair.deviceName}</h1>
      <p className="ms-shop-lead">
        {repair.customerName} · {repair.customerPhone}
        {repair.imei ? ` · IMEI ${repair.imei}` : ""} · {repair.jobType}
        {repair.promisedAt ? ` · promise ${formatPromisedAt(repair.promisedAt)}` : ""}
      </p>
      <p>
        Status: <strong>{repair.status.replaceAll("_", " ")}</strong>
      </p>
      {repair.complaint ? <p>{repair.complaint}</p> : null}

      <div className="ms-shop-status">
        {(
          [
            ["IN_PROGRESS", "In progress"],
            ["READY", "Ready"],
            ["DELIVERED", "Delivered"],
          ] as const
        ).map(([status, label]) => (
          <ShopForm action={advanceRepairAction} key={status} submitLabel={label}>
            <input name="repairId" type="hidden" value={repair.id} />
            <input name="status" type="hidden" value={status} />
          </ShopForm>
        ))}
      </div>

      <div className="ms-shop-panel">
        <h2>Parts used</h2>
        <p className="ms-shop-lead">
          Matching part stocks out on open / in progress when possible. Else pick
          one here.
        </p>
        <ul>
          {repair.parts.length === 0 ? (
            <li>None yet.</li>
          ) : (
            repair.parts.map((part) => (
              <li key={part.id}>
                {part.item.name} × {part.qty}
              </li>
            ))
          )}
        </ul>
        <ShopForm action={repairPartOutAction} submitLabel="Take part">
          <input name="repairId" type="hidden" value={repair.id} />
          <label>
            Part
            <select name="itemId" required>
              {parts.length === 0 ? (
                <option value="" disabled>
                  No parts in stock
                </option>
              ) : (
                parts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · qty {item.qty}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Qty
            <input name="qty" type="number" min={1} defaultValue={1} inputMode="numeric" />
          </label>
        </ShopForm>
      </div>
    </section>
  );
}
