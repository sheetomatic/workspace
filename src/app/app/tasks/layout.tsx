import { requireSession } from "@/lib/require-session";
import { TasksModuleNav } from "@/components/saas/tasks-module-nav";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "TASKS" });

  return (
    <div className="ws-module-layout ws-tasks-module-layout">
      <TasksModuleNav user={user} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
