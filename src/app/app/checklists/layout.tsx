import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { ChecklistsModuleNav } from "@/components/saas/checklists-module-nav";
import { canCreateTasks } from "@/lib/tasks";
import { canEnterChecklists } from "@/lib/bci/bci-access";

export default async function ChecklistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  if (!(await canEnterChecklists(user))) {
    redirect("/app");
  }

  return (
    <div className="ws-module-layout ws-checklists-module-layout">
      <Suspense fallback={null}>
        <ChecklistsModuleNav isManager={canCreateTasks(user.role)} />
      </Suspense>
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
