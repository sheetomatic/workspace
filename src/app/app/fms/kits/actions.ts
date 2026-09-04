"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { canManageSuperAdmins } from "@/lib/platform";
import {
  getLicensedKit,
  isKitInstallAllowed,
} from "@/lib/addons/licensed-kits";
import {
  cancelKitLicense,
  getOrganizationKitLicense,
  grantKitLicense,
  requestKitLicense,
} from "@/lib/addons/kit-license";

export type KitActionResult = { ok: boolean; message: string };

function revalidateKits(organizationId?: string) {
  revalidatePath("/app/fms/kits");
  revalidatePath("/app/fms/setup");
  revalidatePath("/app/billing");
  revalidatePath("/app/clients");
  revalidatePath("/app/mobile-shop");
  if (organizationId) {
    revalidatePath(`/app/clients/${organizationId}`);
  }
}

export async function requestKitLicenseAction(
  formData: FormData,
): Promise<KitActionResult> {
  const user = await requireSession("ADMIN");
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can request a kit license." };
  }

  const kitKey = String(formData.get("kitKey") ?? "").trim();
  const result = await requestKitLicense({
    organizationId: user.organizationId,
    kitKey,
  });
  if (!result.ok) return result;
  revalidateKits();
  if (result.alreadyActive) {
    return { ok: true, message: "License is already active. Open Mobile shop." };
  }
  return {
    ok: true,
    message:
      "License requested. It will appear on the next invoice. After UPI is confirmed, open Mobile shop.",
  };
}

export async function installKitAction(formData: FormData): Promise<KitActionResult> {
  const user = await requireSession("MANAGER");
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const kitKey = String(formData.get("kitKey") ?? "").trim();
  const kit = getLicensedKit(kitKey);
  if (!kit || !kit.shippable || kit.kind === "module_addon") {
    return { ok: false, message: "This kit cannot be installed yet." };
  }

  const license = await getOrganizationKitLicense(user.organizationId, kit.key);
  if (!isKitInstallAllowed(license?.status)) {
    return {
      ok: false,
      message: "Pay the kit line on Billing, or ask Sheetomatic to activate the license first.",
    };
  }

  revalidateKits();
  return {
    ok: true,
    message: `${kit.name} is live. Open Mobile shop on the counter.`,
  };
}

export async function grantKitLicenseAction(
  formData: FormData,
): Promise<KitActionResult> {
  const user = await requireSession("ADMIN");
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    return { ok: false, message: "Only Sheetomatic super admins can grant a kit license." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const kitKey = String(formData.get("kitKey") ?? "").trim();
  if (!organizationId) {
    return { ok: false, message: "Workspace not found." };
  }

  const periodRaw = String(formData.get("billingPeriod") ?? "MONTHLY");
  const billingPeriod = periodRaw === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const result = await grantKitLicense({
    organizationId,
    kitKey,
    grantedByUserId: user.id,
    billingPeriod,
  });
  if (!result.ok) return result;
  revalidateKits(organizationId);
  return { ok: true, message: "License is active. The org can open Mobile shop." };
}

export async function cancelKitLicenseAction(
  formData: FormData,
): Promise<KitActionResult> {
  const user = await requireSession("ADMIN");
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    return { ok: false, message: "Only Sheetomatic super admins can cancel a kit license." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const kitKey = String(formData.get("kitKey") ?? "").trim();
  if (!organizationId) {
    return { ok: false, message: "Workspace not found." };
  }

  const result = await cancelKitLicense({ organizationId, kitKey });
  if (!result.ok) return result;
  revalidateKits(organizationId);
  return { ok: true, message: "License cancelled. Existing jobs were not deleted." };
}

/** Native <form action> helpers (must return void). */
export async function grantKitLicenseForm(formData: FormData) {
  await grantKitLicenseAction(formData);
}

export async function cancelKitLicenseForm(formData: FormData) {
  await cancelKitLicenseAction(formData);
}
