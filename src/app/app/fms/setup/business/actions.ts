"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getBusinessTypeProfile } from "@/lib/fms/business-setup";
import { ensureFmsPresetProvisioned } from "@/lib/fms/provision-preset";

export type BusinessSetupResult = {
  ok: boolean;
  message: string;
  provisioned: Array<{ presetId: string; templateName: string }>;
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
    for (const presetId of presetIds) {
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

    return {
      ok: true,
      message: `${provisioned.length} process FMS ready for ${
        input.industry.trim() || profile.label
      }.`,
      provisioned,
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
