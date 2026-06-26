import { requireSession } from "@/lib/require-session";
import { ChecklistsModuleNav } from "@/components/saas/checklists-module-nav";

export default async function ChecklistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "TASKS" });

  return (
    <div className="ws-module-layout ws-checklists-module-layout">
      <ChecklistsModuleNav user={user} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
