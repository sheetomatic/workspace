import { requireSession } from "@/lib/require-session";
import { TasksModuleLayout } from "@/components/saas/tasks-module-layout";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "TASKS" });

  return <TasksModuleLayout user={user}>{children}</TasksModuleLayout>;
}
