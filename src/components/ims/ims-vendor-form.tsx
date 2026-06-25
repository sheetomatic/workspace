"use client";

import { saveImsVendorAction } from "@/app/app/ims/actions";
import { ImsDynamicForm } from "@/components/ims/ims-dynamic-form";
import type { FormLayout } from "@/lib/ims/form-fields";

export type ImsVendorFormData = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  notes: string | null;
  isActive: boolean;
  customValues: Record<string, unknown> | null;
};

export function ImsVendorForm({
  layout,
  vendor,
}: {
  layout: FormLayout;
  vendor?: ImsVendorFormData;
}) {
  const builtinValues: Record<string, unknown> = vendor
    ? {
        code: vendor.code,
        name: vendor.name,
        contactName: vendor.contactName,
        email: vendor.email,
        phone: vendor.phone,
        gstin: vendor.gstin,
        address: vendor.address,
        paymentTerms: vendor.paymentTerms,
        leadTimeDays: vendor.leadTimeDays,
        notes: vendor.notes,
        isActive: vendor.isActive,
      }
    : {};

  return (
    <ImsDynamicForm
      layout={layout}
      recordId={vendor?.id}
      builtinValues={builtinValues}
      customValues={vendor?.customValues ?? {}}
      action={saveImsVendorAction}
      submitLabel={vendor ? "Update vendor" : "Create vendor"}
    />
  );
}
