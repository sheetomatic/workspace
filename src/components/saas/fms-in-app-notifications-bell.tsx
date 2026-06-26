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
            <section
              id={panelId}
              className="ws-fms-notify-popover"
              role="dialog"
              aria-label="FMS alerts"
            >
              <header className="ws-fms-notify-popover-head">
                <div className="ws-fms-notify-popover-brand">
                  <span className="ws-inbox-status-pill live">FMS</span>
                  <strong>Alerts</strong>
                  {unreadCount > 0 ? (
                    <span className="ws-fms-notify-bell-count">{unreadCount}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ws-fms-notify-bell-close"
                  aria-label="Close alerts"
                  onClick={() => setOpen(false)}
                >
                  <X size={16} aria-hidden />
                </button>
              </header>

              <div className="ws-fms-notify-popover-feed">
                {notifications.length === 0 ? (
                  <p className="ws-fms-muted ws-fms-notify-bell-empty">
                    No new alerts.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <article
                      key={item.id}
                      className="ws-inbox-bubble outbound ws-fms-notify-bubble"
                    >
                      <span className="ws-fms-notify-bubble-tag">{item.title}</span>
                      <p>{item.body}</p>
                      <footer className="ws-fms-notify-bubble-foot">
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                        <div className="ws-fms-notify-bubble-actions">
                          {item.href ? (
                            <a
                              className="ws-fms-notify-bubble-link"
                              href={item.href}
                              onClick={() => setOpen(false)}
                            >
                              Open
                            </a>
                          ) : null}
                          <form action={markReadAction} className="ws-fms-notify-dismiss-form">
                            <input
                              type="hidden"
                              name="notificationId"
                              value={item.id}
                            />
                            <button
                              className="ws-fms-notify-bubble-link"
                              type="submit"
                            >
                              Dismiss
                            </button>
                          </form>
                        </div>
                      </footer>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="ws-fms-notify-bell">
      <button
        ref={triggerRef}
        type="button"
        className={`ws-fms-notify-bell-trigger${unreadCount > 0 ? " has-unread" : ""}`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications, no unread alerts"
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={15} aria-hidden />
        <span className="ws-fms-notify-bell-label">Notifications</span>
        {unreadCount > 0 ? (
          <span className="ws-fms-notify-bell-count" aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : (
          <span className="ws-fms-notify-bell-muted">None</span>
        )}
      </button>
      {panel}
    </div>
  );
}
