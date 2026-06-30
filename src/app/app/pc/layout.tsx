import { requireSession } from "@/lib/require-session";
import { PcModuleNav } from "@/components/saas/pc-module-nav";

export default async function PcLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession(undefined, { module: "TASKS" });

  return (
    <div className="ws-module-layout ws-pc-module-layout">
      <PcModuleNav user={user} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
