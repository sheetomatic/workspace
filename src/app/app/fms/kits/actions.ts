"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { canManageSuperAdmins } from "@/lib/platform";
import { findFmsTemplateByPresetId, ensureFmsPresetProvisioned } from "@/lib/fms/provision-preset";
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
  if (organizationId) {
    revalidatePath(`/app/clients/${organizationId}`);
  }
}

export async function requestKitLicenseAction(
  formData: FormData,
): Promise<KitActionResult> {
  const user = await requireSession("ADMIN", { module: "FMS" });
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
    return { ok: true, message: "License is already active. You can install the FMS." };
  }
  return {
    ok: true,
    message:
      "License requested. It will appear on the next invoice. After Sheetomatic confirms UPI, install the Job Card FMS here.",
  };
}

export async function installKitAction(formData: FormData): Promise<KitActionResult> {
  const user = await requireSession("MANAGER", { module: "FMS" });
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false, message: "Not allowed." };
  }

  const kitKey = String(formData.get("kitKey") ?? "").trim();
  const kit = getLicensedKit(kitKey);
  if (!kit || kit.kind !== "fms_kit" || !kit.shippable || !kit.presetId) {
    return { ok: false, message: "This kit cannot be installed yet." };
  }

  const license = await getOrganizationKitLicense(user.organizationId, kit.key);
  if (!isKitInstallAllowed(license?.status)) {
    return {
      ok: false,
      message: "Pay the kit line on Billing, or ask Sheetomatic to activate the license first.",
    };
  }

  const existing = await findFmsTemplateByPresetId(user.organizationId, kit.presetId);
  if (existing) {
    return { ok: true, message: `${kit.shortName} FMS is already installed.` };
  }

  try {
    await ensureFmsPresetProvisioned(user.organizationId, kit.presetId, user.id);
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    if (text.startsWith("LICENSE_REQUIRED:")) {
      return { ok: false, message: "Active license required before install." };
    }
    console.error("installKitAction failed", error);
    return { ok: false, message: "Install failed. Try again." };
  }

  revalidateKits();
  revalidatePath("/app/fms");
  return { ok: true, message: `${kit.name} is live. Open Setup to start jobs.` };
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
  return { ok: true, message: "License is active. The org can install the FMS." };
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
