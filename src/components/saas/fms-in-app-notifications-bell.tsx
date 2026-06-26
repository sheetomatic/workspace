"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
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

  function dismissNotification(notificationId: string) {
    const formData = new FormData();
    formData.set("notificationId", notificationId);
    startTransition(async () => {
      await markFmsAppNotificationReadAction({ ok: false, message: "" }, formData);
    });
  }

  return (
    <div className="ws-fms-notify-bell" ref={rootRef}>
      <button
        type="button"
        className={`ws-fms-notify-bell-trigger${open ? " is-open" : ""}${unreadCount > 0 ? " has-unread" : ""}`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications, no unread alerts"
        }
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
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

      {open ? (
        <section
          id={panelId}
          className="ws-fms-notify-dropdown"
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
                      <button
                        type="button"
                        className="ws-fms-notify-bubble-link"
                        disabled={pending}
                        onClick={() => dismissNotification(item.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </footer>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
