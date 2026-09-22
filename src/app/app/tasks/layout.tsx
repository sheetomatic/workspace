import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { TasksModuleLayout } from "@/components/saas/tasks-module-layout";
import { canEnterTasksApp } from "@/lib/bci/bci-access";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  if (!(await canEnterTasksApp(user))) {
    redirect("/app");
  }

  return <TasksModuleLayout user={user}>{children}</TasksModuleLayout>;
}
