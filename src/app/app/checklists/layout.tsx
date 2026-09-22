import { Suspense } from "react";
import { requireSession } from "@/lib/require-session";
import { ChecklistsModuleNav } from "@/components/saas/checklists-module-nav";
import { canCreateTasks } from "@/lib/tasks";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";

export default async function ChecklistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });

  return (
    <div className="ws-module-layout ws-checklists-module-layout">
      <Suspense fallback={null}>
        <ChecklistsModuleNav isManager={canCreateTasks(user.role)} />
      </Suspense>
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
