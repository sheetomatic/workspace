"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getBusinessTypeProfile } from "@/lib/fms/business-setup";
import { ensureFmsPresetProvisioned } from "@/lib/fms/provision-preset";
import { licensedKitKeyForPreset } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";

export type BusinessSetupResult = {
  ok: boolean;
  message: string;
  provisioned: Array<{ presetId: string; templateName: string }>;
  licenseRequired?: string[];
};

export async function provisionBusinessProcesses(input: {
  businessTypeId: string;
  industry: string;
  presetIds: string[];
}): Promise<BusinessSetupResult> {
  try {
    const user = await requireSession("MANAGER", { module: "FMS" });
    if (!hasMinimumRole(user.role, "MANAGER")) {
      return { ok: false, message: "Not allowed.", provisioned: [] };
    }

    const profile = getBusinessTypeProfile(input.businessTypeId);
    if (!profile) {
      return { ok: false, message: "Unknown business type.", provisioned: [] };
    }

    const allowed = new Set(profile.processes.map((process) => process.presetId));
    const presetIds = input.presetIds.filter((id) => allowed.has(id));
    if (presetIds.length === 0) {
      return {
        ok: false,
        message: "Select at least one process to set up.",
        provisioned: [],
      };
    }

    const provisioned: BusinessSetupResult["provisioned"] = [];
    const licenseRequired: string[] = [];
    for (const presetId of presetIds) {
      const kitKey = licensedKitKeyForPreset(presetId);
      if (kitKey && !(await orgHasActiveKitLicense(user.organizationId, kitKey))) {
        licenseRequired.push(kitKey);
        continue;
      }
      const template = await ensureFmsPresetProvisioned(
        user.organizationId,
        presetId,
        user.id,
      );
      provisioned.push({ presetId, templateName: template.name });
    }

    revalidatePath("/app/fms/setup");
    revalidatePath("/app/fms/fulfillment");
    revalidatePath("/app/fms/lines");
    revalidatePath("/app/fms/kits");

    if (provisioned.length === 0 && licenseRequired.length > 0) {
      return {
        ok: false,
        message:
          "Workshop Job Card needs an active license. Open Licensed kits, request the license, then install.",
        provisioned: [],
        licenseRequired,
      };
    }

    const licenseNote =
      licenseRequired.length > 0
        ? " Job Card was skipped — request the license under Licensed kits."
        : "";

    return {
      ok: true,
      message: `${provisioned.length} process FMS ready for ${
        input.industry.trim() || profile.label
      }.${licenseNote}`,
      provisioned,
      licenseRequired,
    };
  } catch (error) {
    console.error("provisionBusinessProcesses failed", error);
    return {
      ok: false,
      message: "Setup failed. Please try again.",
      provisioned: [],
    };
  }
}
