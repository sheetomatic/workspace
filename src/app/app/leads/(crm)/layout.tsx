import { redirect } from "next/navigation";
import { WorkspacePageScrollBridge } from "@/components/saas/workspace-page-scroll-bridge";
import { CrmModuleNav } from "@/components/saas/crm-module-nav";
import { getCrmModuleNavCounts } from "@/lib/leads/crm-module-stats";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { withDbRetry } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { getEffectiveCrmSubModulesForUser } from "@/lib/crm/crm-access";
import { isLearnPortalRequest } from "@/lib/tenant-host";

const EMPTY_COUNTS: CrmModuleNavCounts = {
  leads: 0,
  nextTime: 0,
  meetings: 0,
  quotations: 0,
  quotationValue: 0,
  services: 0,
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
  const learnPortal = await isLearnPortalRequest();
  const user = await requireSession(
    undefined,
    learnPortal ? undefined : { module: "CRM" },
  );
  if (learnPortal) {
    return (
      <div className="ws-module-layout ws-module-layout--no-subnav leads-module-layout">
        <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />
        <div className="ws-module-layout-main">{children}</div>
      </div>
    );
  }

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
