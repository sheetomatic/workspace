import { requireSession } from "@/lib/require-session";
import { FmsModuleNav } from "@/components/saas/fms-module-nav";
import { listFmsQueueTemplatesForUser } from "@/lib/fms/queries";
import {
  countUnreadAppNotifications,
  listUnreadAppNotifications,
} from "@/lib/fms/in-app-notifications";

export default async function FmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession(undefined, { module: "FMS" });
  const [queueTemplates, unreadCount, notifications] = await Promise.all([
    listFmsQueueTemplatesForUser(user.organizationId, user.id),
    countUnreadAppNotifications(user.id, user.organizationId),
    listUnreadAppNotifications(user.id, user.organizationId),
  ]);

  return (
    <div className="ws-module-layout ws-fms-module-layout">
      <FmsModuleNav
        user={user}
        notifications={notifications.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          href: item.href,
          createdAt: item.createdAt.toISOString(),
        }))}
        unreadCount={unreadCount}
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
