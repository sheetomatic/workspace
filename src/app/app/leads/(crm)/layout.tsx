import { redirect } from "next/navigation";
import { WorkspacePageScrollBridge } from "@/components/saas/workspace-page-scroll-bridge";
import { CrmModuleNav } from "@/components/saas/crm-module-nav";
import { getCrmModuleNavCounts } from "@/lib/leads/crm-module-stats";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { withDbRetry } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { getEffectiveCrmSubModulesForUser } from "@/lib/crm/crm-access";

const EMPTY_COUNTS: CrmModuleNavCounts = {
  leads: 0,
  meetings: 0,
  quotations: 0,
  quotationValue: 0,
  payments: 0,
  paymentValue: 0,
  projectsRunning: 0,
  projectsDelivered: 0,
  training: 0,
};

export default async function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  const { effective } = await getEffectiveCrmSubModulesForUser(user);
  if (effective.length === 0) {
    redirect("/app");
  }

  // Soft-fail nav badges so a Neon flap does not blank the whole CRM shell.
  let counts = EMPTY_COUNTS;
  try {
    counts = await withDbRetry(() =>
      getCrmModuleNavCounts(user.organizationId),
    );
  } catch (error) {
    console.error("[crm-layout] nav counts unavailable", error);
  }

  return (
    <div className="ws-module-layout leads-module-layout">
      <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />
      <CrmModuleNav counts={counts} enabledSubModules={effective} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
