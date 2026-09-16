import { requireSession } from "@/lib/require-session";
import { ChecklistsModuleNav } from "@/components/saas/checklists-module-nav";
import { canCreateTasks } from "@/lib/tasks";

export default async function ChecklistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "TASKS" });

  return (
    <div className="ws-module-layout ws-checklists-module-layout">
      <ChecklistsModuleNav isManager={canCreateTasks(user.role)} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
