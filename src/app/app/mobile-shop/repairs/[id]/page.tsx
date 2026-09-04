import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { getRepair, listMobileShopItems } from "@/lib/mobile-shop/store";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import {
  advanceRepairAction,
  repairPartOutAction,
} from "@/app/app/mobile-shop/actions";

export default async function MobileShopRepairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession();
  if (!(await orgHasActiveKitLicense(user.organizationId, MOBILE_SHOP_KIT_KEY))) {
    redirect("/app/mobile-shop");
  }
  const { id } = await params;
  const repair = await getRepair(user.organizationId, id);
  if (!repair) notFound();
  const parts = (await listMobileShopItems(user.organizationId, "PART")).filter(
    (item) => item.qty > 0,
  );

  return (
    <section>
      <h1>{repair.deviceName}</h1>
      <p>
        {repair.customerName} · {repair.customerPhone}
        {repair.imei ? ` · IMEI ${repair.imei}` : ""} · {repair.jobType}
      </p>
      <p>Status: {repair.status.replaceAll("_", " ")}</p>
      {repair.complaint ? <p>{repair.complaint}</p> : null}

      <div className="ms-shop-status">
        {([
          ["IN_PROGRESS", "In progress"],
          ["READY", "Ready"],
          ["DELIVERED", "Delivered"],
        ] as const).map(([status, label]) => (
          <ShopForm action={advanceRepairAction} key={status} submitLabel={label}>
            <input name="repairId" type="hidden" value={repair.id} />
            <input name="status" type="hidden" value={status} />
          </ShopForm>
        ))}
      </div>

      <h2>Parts stock-out</h2>
      <ShopForm action={repairPartOutAction}>
        <input name="repairId" type="hidden" value={repair.id} />
        <label>
          Part
          <select name="itemId" required>
            {parts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · qty {item.qty}
              </option>
            ))}
          </select>
        </label>
        <label>
          Qty
          <input name="qty" type="number" min={1} defaultValue={1} />
        </label>
      </ShopForm>

      <h2>Parts on this job</h2>
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
    </section>
  );
}
