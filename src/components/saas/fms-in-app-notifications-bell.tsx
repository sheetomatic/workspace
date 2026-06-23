"use client";

import { useActionState } from "react";
import { markFmsAppNotificationReadAction } from "@/app/app/fms/notification-actions";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
};

export function FmsInAppNotificationsBell({
  unreadCount,
  notifications,
}: {
  unreadCount: number;
  notifications: NotificationRow[];
}) {
  const [, markReadAction] = useActionState(
    markFmsAppNotificationReadAction,
    { ok: false, message: "" },
  );

  return (
    <details className="ws-fms-notify-bell">
      <summary aria-label={`${unreadCount} unread FMS notifications`}>
        Notifications
        {unreadCount > 0 ? (
          <span className="ws-fms-notify-bell-count">{unreadCount}</span>
        ) : null}
      </summary>
      <div className="ws-fms-notify-bell-panel">
        {notifications.length === 0 ? (
          <p className="ws-fms-muted">No new notifications.</p>
        ) : (
          <ul className="ws-fms-notify-bell-list">
            {notifications.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </time>
                </div>
                <div className="ws-fms-notify-bell-actions">
                  {item.href ? (
                    <a className="btn-secondary btn-sm" href={item.href}>
                      Open
                    </a>
                  ) : null}
                  <form action={markReadAction}>
                    <input type="hidden" name="notificationId" value={item.id} />
                    <button className="btn-secondary btn-sm" type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
