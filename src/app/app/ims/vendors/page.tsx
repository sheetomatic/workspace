import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsVendorForm } from "@/components/ims/ims-vendor-form";
import { ImsVendorsManager } from "@/components/ims/ims-vendors-manager";
import { ImsVendorImport } from "@/components/ims/ims-vendor-import";
import type { ImsVendorFormData } from "@/components/ims/ims-vendor-form";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getImsFormConfig, listImsVendors } from "@/lib/ims/ims-store";
import { resolveFormLayout } from "@/lib/ims/form-fields";

export default async function ImsVendorsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [vendors, formConfig] = await Promise.all([
    listImsVendors(user.organizationId, false),
    getImsFormConfig(user.organizationId, "VENDOR"),
  ]);

  const layout = resolveFormLayout(
    "VENDOR",
    formConfig.fieldSettings,
    formConfig.customFields,
  );

  const formVendors: ImsVendorFormData[] = vendors.map((vendor) => ({
    id: vendor.id,
    code: vendor.code,
    name: vendor.name,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    gstin: vendor.gstin,
    paymentTerms: vendor.paymentTerms,
    leadTimeDays: vendor.leadTimeDays,
    notes: vendor.notes,
    isActive: vendor.isActive,
    customValues:
      (vendor.customValues as Record<string, unknown> | null) ?? null,
  }));

  const canManage = hasMinimumRole(user.role, "MANAGER");

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Vendor master"
        description="Define suppliers with contact, GSTIN, payment terms, and lead times."
      />

      {canManage ? <ImsVendorImport /> : null}

      <div className="ws-ims-stack">
        {canManage ? (
          <section className="ws-ims-panel">
            <h2>Add vendor</h2>
            <ImsVendorForm layout={layout} />
          </section>
        ) : null}

        <section className="ws-ims-panel">
          <h2>All vendors ({vendors.length})</h2>
          <ImsVendorsManager
            vendors={formVendors}
            layout={layout}
            canManage={canManage}
          />
        </section>
      </div>
    </div>
  );
}
