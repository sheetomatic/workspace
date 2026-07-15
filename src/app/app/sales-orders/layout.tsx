import { WorkspacePageScrollBridge } from "@/components/saas/workspace-page-scroll-bridge";
import { requireSession } from "@/lib/require-session";

export default async function SalesOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession(undefined, { module: "FMS" });
  return (
    <div className="ws-module-layout ws-module-layout--no-subnav">
      <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
