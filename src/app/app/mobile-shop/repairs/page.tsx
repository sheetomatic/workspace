import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import { listRepairs, MOBILE_REPAIR_JOB_TYPES } from "@/lib/mobile-shop/store";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { createRepairAction } from "@/app/app/mobile-shop/actions";

export default async function MobileShopRepairsPage() {
  const user = await requireSession();
  if (!(await orgHasActiveKitLicense(user.organizationId, MOBILE_SHOP_KIT_KEY))) {
    redirect("/app/mobile-shop");
  }
  const repairs = await listRepairs(user.organizationId);

  return (
    <section>
      <h1>Repairs</h1>
      <p>Job card: received → in progress → ready → delivered. Parts stock-out on the job.</p>

      <h2>New job</h2>
      <ShopForm action={createRepairAction}>
        <label>
          Customer
          <input name="customerName" required />
        </label>
        <label>
          Phone
          <input name="customerPhone" required />
        </label>
        <label>
          Device
          <input name="deviceName" required placeholder="Redmi 13 / screen" />
        </label>
        <label>
          IMEI
          <input name="imei" />
        </label>
        <label>
          Job type
          <select name="jobType" defaultValue="Screen">
            {MOBILE_REPAIR_JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Complaint
          <textarea name="complaint" rows={2} />
        </label>
      </ShopForm>

      <h2>Open jobs</h2>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Device</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {repairs.length === 0 ? (
            <tr>
              <td colSpan={4}>No jobs yet.</td>
            </tr>
          ) : (
            repairs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/app/mobile-shop/repairs/${job.id}`}>
                    {job.customerName}
                  </Link>
                </td>
                <td>{job.deviceName}</td>
                <td>{job.jobType}</td>
                <td>{job.status.replaceAll("_", " ")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
