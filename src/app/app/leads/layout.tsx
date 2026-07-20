import { WorkspacePageScrollBridge } from "@/components/saas/workspace-page-scroll-bridge";
import { CrmModuleNav } from "@/components/saas/crm-module-nav";
import { getCrmModuleNavCounts } from "@/lib/leads/crm-module-stats";
import { requireSession } from "@/lib/require-session";

export default async function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  const counts = await getCrmModuleNavCounts(user.organizationId);

  return (
    <div className="ws-module-layout leads-module-layout">
      <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />
      <CrmModuleNav counts={counts} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
