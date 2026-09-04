import Link from "next/link";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { createRepairAction } from "@/app/app/mobile-shop/actions";
import { requireMobileShopPage } from "@/lib/mobile-shop/access";
import { formatPromisedAt } from "@/lib/mobile-shop/promised-at";
import { listRepairs, MOBILE_REPAIR_JOB_TYPES } from "@/lib/mobile-shop/store";

export default async function MobileShopRepairsPage() {
  const user = await requireMobileShopPage();
  const repairs = await listRepairs(user.organizationId);

  return (
    <section>
      <h1>Repairs</h1>
      <p className="ms-shop-lead">
        रिपेयर. Customer, phone, model, issue, promise date. Open the job —
        a matching part stocks out if you have one.
      </p>

      <ShopForm action={createRepairAction} submitLabel="Open job">
        <label>
          Customer
          <input name="customerName" required autoComplete="name" />
        </label>
        <label>
          WhatsApp / phone
          <input name="customerPhone" required inputMode="tel" autoComplete="tel" />
        </label>
        <label>
          Phone model
          <input name="deviceName" required placeholder="Redmi 13" autoComplete="off" />
        </label>
        <label>
          IMEI
          <input name="imei" inputMode="numeric" autoComplete="off" />
        </label>
        <label>
          Job
          <select name="jobType" defaultValue="Screen">
            {MOBILE_REPAIR_JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Issue
          <textarea name="complaint" rows={2} placeholder="Cracked glass / no charge" />
        </label>
        <label>
          Promise date
          <input name="promisedAt" type="date" />
        </label>
      </ShopForm>

      <h2>Open jobs</h2>
      {repairs.length === 0 ? (
        <p className="ms-shop-empty">
          No jobs yet — tap Open job above.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {repairs.map((job) => (
            <Link className="ms-shop-card" href={`/app/mobile-shop/repairs/${job.id}`} key={job.id}>
              <div className="ms-shop-card-row">
                <div>
                  <strong>{job.customerName}</strong>
                  <span>
                    {job.deviceName} · {job.jobType}
                    {job.promisedAt ? ` · due ${formatPromisedAt(job.promisedAt)}` : ""}
                  </span>
                </div>
                <span className="ms-shop-chip">{job.status.replaceAll("_", " ")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
