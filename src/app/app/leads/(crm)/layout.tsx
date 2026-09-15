import { redirect } from "next/navigation";
import { WorkspacePageScrollBridge } from "@/components/saas/workspace-page-scroll-bridge";
import { CrmModuleNavDeferred } from "@/app/app/leads/(crm)/crm-module-nav-deferred";
import { requireSession } from "@/lib/require-session";
import { getEffectiveCrmSubModulesForUser } from "@/lib/crm/crm-access";
import { isLearnPortalRequest } from "@/lib/tenant-host";

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

  const { effective, moduleOrder } = await getEffectiveCrmSubModulesForUser(user);
  if (effective.length === 0) {
    redirect("/app");
  }

  return (
    <div className="ws-module-layout leads-module-layout">
      <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />
      <CrmModuleNavDeferred
        organizationId={user.organizationId}
        enabledSubModules={effective}
        moduleOrder={moduleOrder}
      />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
