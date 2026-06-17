"use client";

import type { FmsAlertConfig } from "@/lib/fms/constants";

function alertsEnabled(config: FmsAlertConfig) {
  return config.whatsappEnabled || config.emailEnabled;
}

export function FmsNotificationsSettingsPanel({
  alertConfig,
  onUpdate,
  onClose,
}: {
  alertConfig: FmsAlertConfig;
  onUpdate: (patch: Partial<FmsAlertConfig>) => void;
  onClose: () => void;
}) {
  const enabled = alertsEnabled(alertConfig);

  return (
    <aside className="ws-fms-jf-props-panel ws-fms-notify-panel" aria-label="Notification rules">
      <header className="ws-fms-jf-props-head">
        <h3>Notification rules</h3>
        <button type="button" className="ws-fms-jf-props-close" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="ws-fms-jf-props-body">
        <p className="ws-fms-muted ws-fms-notify-intro">
          WhatsApp and email alerts for step owners when this FMS goes live.
        </p>
        <div className="ws-fms-jf-step-checks">
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={alertConfig.whatsappEnabled}
              onChange={(event) =>
                onUpdate({ whatsappEnabled: event.target.checked })
              }
            />
            Enable WhatsApp alerts
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={alertConfig.emailEnabled}
              onChange={(event) =>
                onUpdate({ emailEnabled: event.target.checked })
              }
            />
            Enable email alerts
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={alertConfig.onAssign}
              disabled={!enabled}
              onChange={(event) => onUpdate({ onAssign: event.target.checked })}
            />
            When step is assigned
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={alertConfig.onDueComing}
              disabled={!enabled}
              onChange={(event) =>
                onUpdate({ onDueComing: event.target.checked })
              }
            />
            Due date coming
          </label>
          <label className="ws-fms-jf-option-field ws-fms-jf-alert-days">
            Days before due date
            <input
              type="number"
              min={0}
              max={30}
              disabled={!enabled || !alertConfig.onDueComing}
              value={alertConfig.dueComingDaysBefore}
              onChange={(event) =>
                onUpdate({
                  dueComingDaysBefore: Number(event.target.value) || 0,
                })
              }
            />
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={alertConfig.onSameDay}
              disabled={!enabled}
              onChange={(event) => onUpdate({ onSameDay: event.target.checked })}
            />
            Same day reminder
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={alertConfig.onOverdue}
              disabled={!enabled}
              onChange={(event) => onUpdate({ onOverdue: event.target.checked })}
            />
            Overdue alert
          </label>
        </div>
      </div>
    </aside>
  );
}
