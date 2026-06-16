import { requireSession } from "@/lib/require-session";
import { FmsModuleNav } from "@/components/saas/fms-module-nav";

export default async function FmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "FMS" });

  return (
    <div className="ws-module-layout ws-fms-module-layout">
      <FmsModuleNav user={user} />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
