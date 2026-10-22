import type { WorkspaceModule } from "@prisma/client";
import { BCI_SUB_MODULES } from "@/lib/bci/bci-sub-modules";
import { resolveActivationPreset } from "@/lib/workspace-activation-bundles";
import { businessWorkspacePlan } from "@/lib/business-workspace-plans";

export function resolveProvisionAccess(input: {
  bundle: string;
  selectedModules?: string[];
  selectedSuiteParts?: string[];
  maxMembers?: number;
  maxFmsTemplates?: number;
}) {
  const preset = resolveActivationPreset(input.bundle);
  const business = businessWorkspacePlan(input.bundle);
  if (business && !input.selectedModules) throw new Error("Review and tick the modules for this workspace.");
  const requested = input.selectedModules ?? preset.allowedModules;
  if (requested.some((module) => !preset.allowedModules.includes(module as WorkspaceModule))) {
    throw new Error("Selected modules must belong to the chosen plan.");
  }
  const allowedModules = [...new Set(requested)] as WorkspaceModule[];
  const enabledBciSubModules = allowedModules.includes("FMS")
    ? BCI_SUB_MODULES.filter((part) => (input.selectedSuiteParts ?? []).includes(part.id)).map((part) => part.id)
    : [];
  if (business && (!Number.isInteger(input.maxMembers) || input.maxMembers! < 1 || input.maxMembers! > 2_147_483_647 ||
      !Number.isInteger(input.maxFmsTemplates) || input.maxFmsTemplates! < 0 || input.maxFmsTemplates! > 2_147_483_647)) {
    throw new Error("Enter the agreed member and FMS workflow limits.");
  }
  return {
    ...preset,
    allowedModules,
    enabledBciSubModules,
    maxMembers: business ? input.maxMembers! : preset.maxMembers,
    maxFmsTemplates: business ? input.maxFmsTemplates! : preset.maxFmsTemplates,
  };
}
