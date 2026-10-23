import type { OrgPlan, WorkspaceModule } from "@prisma/client";

/** New onboarding SKUs, distinct from legacy plans and rates. */
export const BUSINESS_WORKSPACE_PLANS = [
  { id: "BUSINESS_STARTER", bundle: "business_starter", label: "Starter", monthlyInr: 4999, modules: ["FMS"] },
  { id: "BUSINESS_SCALE", bundle: "business_scale", label: "Scale", monthlyInr: 6999, modules: ["FMS", "CRM"] },
  { id: "BUSINESS_ENTERPRISE", bundle: "business_enterprise", label: "Enterprise", monthlyInr: 9999, modules: ["FMS", "CRM", "HR", "IMS", "TASKS", "REPORTS"] },
] as const satisfies readonly {
  id: OrgPlan;
  bundle: string;
  label: string;
  monthlyInr: number;
  modules: readonly WorkspaceModule[];
}[];

export function businessWorkspacePlan(value: string) {
  return BUSINESS_WORKSPACE_PLANS.find((plan) => plan.id === value || plan.bundle === value);
}
