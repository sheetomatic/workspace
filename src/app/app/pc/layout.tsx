import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { PcModuleNav } from "@/components/saas/pc-module-nav";
import { canEnterPc } from "@/lib/bci/bci-access";
import "@/components/saas/pc-jobs.css";

export default async function PcLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  if (!(await canEnterPc(user))) {
    redirect("/app");
  }

  return (
    <div className="ws-module-layout ws-pc-module-layout">
      <PcModuleNav user={user} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
