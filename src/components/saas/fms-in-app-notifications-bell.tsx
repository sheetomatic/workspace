"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
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
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [, markReadAction] = useActionState(markFmsAppNotificationReadAction, {
    ok: false,
    message: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function positionPanel() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(320, window.innerWidth - 24);
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - panelWidth - 12,
      );
      const top = rect.bottom + 8;
      setPanelStyle({ top, left });
    }

    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);

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
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const panel =
    open && panelStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            className="ws-fms-notify-bell-panel"
            role="dialog"
            aria-label="FMS notifications"
            style={{
              position: "fixed",
              top: panelStyle.top,
              left: panelStyle.left,
              width: Math.min(320, window.innerWidth - 24),
            }}
          >
            <header className="ws-fms-notify-bell-panel-head">
              <strong>Notifications</strong>
              {unreadCount > 0 ? (
                <span className="ws-fms-notify-bell-count">{unreadCount}</span>
              ) : null}
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
