import { requireSession } from "@/lib/require-session";
import { FmsModuleNav } from "@/components/saas/fms-module-nav";
import { listFmsQueueTemplatesForUser } from "@/lib/fms/queries";

export default async function FmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  const queueTemplates = await listFmsQueueTemplatesForUser(
    user.organizationId,
    user.id,
  );

  return (
    <div className="ws-module-layout ws-fms-module-layout">
      <FmsModuleNav
        user={user}
        queueTemplates={queueTemplates.map((template) => ({
          id: template.id,
          name: template.name,
          activeStops: template.activeStops,
        }))}
      />
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
