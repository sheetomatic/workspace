import { FmsModuleNav } from "@/components/saas/fms-module-nav";
import type { SessionUser } from "@/lib/auth";
import { listFmsQueueTemplatesForUser } from "@/lib/fms/queries";
import {
  countUnreadAppNotifications,
  listUnreadAppNotifications,
} from "@/lib/fms/in-app-notifications";

export async function FmsModuleNavAsync({ user }: { user: SessionUser }) {
  const [queueTemplates, unreadCount, notifications] = await Promise.all([
    listFmsQueueTemplatesForUser(user.organizationId, user.id),
    countUnreadAppNotifications(user.id, user.organizationId),
    listUnreadAppNotifications(user.id, user.organizationId),
  ]);

  return (
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
  );
}
