import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { getVendorDetail, listImsCustomFields } from "@/lib/ims/ims-store";

function formatCustomValue(
  value: unknown,
  fieldType: string,
): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (fieldType === "CHECKBOX") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

export default async function ImsVendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const user = await requireSession(undefined, { module: "IMS" });
  const { vendorId } = await params;
  const [vendor, customFields] = await Promise.all([
    getVendorDetail(user.organizationId, vendorId),
    listImsCustomFields(user.organizationId, "VENDOR"),
  ]);

  if (!vendor) {
    notFound();
  }

  const customValues =
    (vendor.customValues as Record<string, unknown> | null) ?? {};
  const activeCustomFields = customFields.filter((field) => field.isActive);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title={`${vendor.code} - ${vendor.name}`}
        description={vendor.notes ?? "Vendor contact and supply terms."}
      />

      <p className="ws-ims-help">
        <Link href="/app/ims/vendors">Back to vendors</Link>
      </p>

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>Contact</h2>
          <ul className="ws-ims-abc-list">
            <li>
              <span>Contact name</span>
              <strong>{vendor.contactName ?? "-"}</strong>
            </li>
            <li>
              <span>Email</span>
              <strong>{vendor.email ?? "-"}</strong>
            </li>
            <li>
              <span>Phone</span>
              <strong>{vendor.phone ?? "-"}</strong>
            </li>
            <li>
              <span>Address</span>
              <strong>{vendor.address ?? "-"}</strong>
            </li>
          </ul>
        </section>

        <section className="ws-ims-panel">
          <h2>Supply terms</h2>
          <ul className="ws-ims-abc-list">
            <li>
              <span>GSTIN</span>
              <strong>{vendor.gstin ?? "-"}</strong>
            </li>
            <li>
              <span>Payment terms</span>
              <strong>{vendor.paymentTerms ?? "-"}</strong>
            </li>
            <li>
              <span>Lead time</span>
              <strong>
                {vendor.leadTimeDays !== null
                  ? `${vendor.leadTimeDays} days`
                  : "-"}
              </strong>
            </li>
            <li>
              <span>Active</span>
              <strong>{vendor.isActive ? "Yes" : "No"}</strong>
            </li>
          </ul>
        </section>
      </div>

      {activeCustomFields.length > 0 ? (
        <section className="ws-ims-panel">
          <h2>Custom fields</h2>
          <ul className="ws-ims-abc-list">
            {activeCustomFields.map((field) => (
              <li key={field.id}>
                <span>{field.label}</span>
                <strong>
                  {formatCustomValue(customValues[field.key], field.fieldType)}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
