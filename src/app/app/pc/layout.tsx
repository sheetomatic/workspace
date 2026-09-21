import { requireSession } from "@/lib/require-session";
import { PcModuleNav } from "@/components/saas/pc-module-nav";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";
import "@/components/saas/pc-jobs.css";

export default async function PcLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });

  return (
    <div className="ws-module-layout ws-pc-module-layout">
      <PcModuleNav user={user} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
