import { Suspense } from "react";
import { requireSession } from "@/lib/require-session";
import { FmsModuleNav } from "@/components/saas/fms-module-nav";
import { FmsModuleNavAsync } from "@/app/app/fms/fms-module-nav-async";

export default async function FmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "FMS" });

  return (
    <div className="ws-module-layout ws-fms-module-layout">
      <Suspense fallback={<FmsModuleNav user={user} queueTemplates={[]} />}>
        <FmsModuleNavAsync user={user} />
      </Suspense>
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
