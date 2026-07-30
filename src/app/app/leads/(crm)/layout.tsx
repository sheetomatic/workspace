import { redirect } from "next/navigation";
import { WorkspacePageScrollBridge } from "@/components/saas/workspace-page-scroll-bridge";
import { CrmModuleNav } from "@/components/saas/crm-module-nav";
import { getCrmModuleNavCounts } from "@/lib/leads/crm-module-stats";
import { requireSession } from "@/lib/require-session";
import { getEffectiveCrmSubModulesForUser } from "@/lib/crm/crm-access";

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
  const counts = await getCrmModuleNavCounts(user.organizationId);

  return (
    <div className="ws-module-layout leads-module-layout">
      <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />
      <CrmModuleNav counts={counts} enabledSubModules={effective} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
