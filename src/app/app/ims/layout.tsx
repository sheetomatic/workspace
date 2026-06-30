import { ImsModuleNav } from "@/components/saas/ims-module-nav";
import { requireSession } from "@/lib/require-session";

export default async function ImsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "IMS" });

  return (
    <div className="ws-module-layout ws-ims-module-layout">
      <ImsModuleNav />
      <div className="ws-module-layout-main">
        <div className="saas-page ws-ims-sf">{children}</div>
      </div>
    </div>
  );
}
