"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
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
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const [, markReadAction] = useActionState(markFmsAppNotificationReadAction, {
    ok: false,
    message: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="workspace-app ws-fms-notify-bell-portal" ref={panelRef}>
            <button
              type="button"
              className="ws-fms-notify-bell-backdrop"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            />
            <div
              id={panelId}
              className="ws-fms-notify-bell-panel"
              role="dialog"
              aria-label="FMS notifications"
            >
              <header className="ws-fms-notify-bell-panel-head">
                <div className="ws-fms-notify-bell-panel-title">
                  <strong>Notifications</strong>
                  {unreadCount > 0 ? (
                    <span className="ws-fms-notify-bell-count">{unreadCount}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ws-fms-notify-bell-close"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  <X size={16} aria-hidden />
                </button>
              </header>
              {notifications.length === 0 ? (
                <p className="ws-fms-muted ws-fms-notify-bell-empty">
                  No new notifications.
                </p>
              ) : (
                <ul className="ws-fms-notify-bell-list">
                  {notifications.map((item) => (
                    <li key={item.id} className="ws-fms-notify-bell-item">
                      <div className="ws-fms-notify-bell-copy">
                        <strong className="ws-fms-notify-bell-title">
                          {item.title}
                        </strong>
                        <p className="ws-fms-notify-bell-body">{item.body}</p>
                        <time
                          className="ws-fms-notify-bell-time"
                          dateTime={item.createdAt}
                        >
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </div>
                      <div className="ws-fms-notify-bell-actions">
                        {item.href ? (
                          <a
                            className="btn-secondary btn-sm"
                            href={item.href}
                            onClick={() => setOpen(false)}
                          >
                            Open
                          </a>
                        ) : null}
                        <form action={markReadAction}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={item.id}
                          />
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="ws-fms-notify-bell">
      <button
        ref={triggerRef}
        type="button"
        className="ws-fms-notify-bell-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={15} aria-hidden />
        <span>Notifications</span>
        {unreadCount > 0 ? (
          <span className="ws-fms-notify-bell-count">{unreadCount}</span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
