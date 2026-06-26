import { Bell } from "lucide-react";
import { saveNotificationSettingsAction } from "@/app/app/settings/notification-actions";
import {
  ALERT_DAYS_OPTIONS,
  type NotificationSettingsRow,
} from "@/lib/notification-settings";

export function NotificationSettingsPanel({
  settings,
}: {
  settings: NotificationSettingsRow;
}) {
  return (
    <article className="saas-panel ws-notification-settings">
      <div className="ws-notification-head">
        <div>
          <h3>
            <Bell size={18} aria-hidden />
            Alerts &amp; reminders
          </h3>
          <p className="ws-notification-lead">
            Choose when to be notified about upcoming hearings, due dates, and
            overdue items. Alerts run on the daily reminder job when email or
            WhatsApp is configured.
          </p>
        </div>
      </div>

      <form action={saveNotificationSettingsAction} className="ws-notification-form">
        <div className="ws-notification-grid">
          <section className="ws-notification-card">
            <h4>Legal cases</h4>
            <label className="ws-notification-toggle">
              <input
                defaultChecked={settings.caseDueDateAlert}
                name="caseDueDateAlert"
                type="checkbox"
              />
              <span>
                <strong>Upcoming hearing / due date</strong>
                <small>Remind before the next court date</small>
              </span>
            </label>
            <label className="ws-notification-toggle">
              <input
                defaultChecked={settings.caseOverdueAlert}
                name="caseOverdueAlert"
                type="checkbox"
              />
              <span>
                <strong>Overdue hearings</strong>
                <small>When a hearing date has passed</small>
              </span>
            </label>
          </section>

          <section className="ws-notification-card">
            <h4>Tasks</h4>
            <label className="ws-notification-toggle">
              <input
                defaultChecked={settings.taskDueDateAlert}
                name="taskDueDateAlert"
                type="checkbox"
              />
              <span>
                <strong>Task due date</strong>
                <small>Before a task is due</small>
              </span>
            </label>
            <label className="ws-notification-toggle">
              <input
                defaultChecked={settings.taskOverdueAlert}
                name="taskOverdueAlert"
                type="checkbox"
              />
              <span>
                <strong>Overdue tasks</strong>
                <small>When a task passes its due date</small>
              </span>
            </label>
          </section>

          <section className="ws-notification-card">
            <h4>Inventory (IMS)</h4>
            <label className="ws-notification-toggle">
              <input
                defaultChecked={settings.imsReorderAlert}
                name="imsReorderAlert"
                type="checkbox"
              />
              <span>
                <strong>Low-stock digest</strong>
                <small>Daily reorder and stock alerts</small>
              </span>
            </label>
          </section>

          <section className="ws-notification-card ws-notification-card-wide">
            <h4>Delivery</h4>
            <div className="ws-notification-delivery-row">
              <label className="ws-notification-field">
                Days before due date
                <select
                  defaultValue={String(settings.alertDaysBefore)}
                  name="alertDaysBefore"
                >
                  {ALERT_DAYS_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days} {days === 1 ? "day" : "days"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="ws-notification-channels" aria-label="Alert channels">
                <label className="ws-notification-channel">
                  <input
                    defaultChecked={settings.alertViaEmail}
                    name="alertViaEmail"
                    type="checkbox"
                  />
                  Email
                </label>
                <label className="ws-notification-channel">
                  <input
                    defaultChecked={settings.alertViaWhatsApp}
                    name="alertViaWhatsApp"
                    type="checkbox"
                  />
                  WhatsApp
                </label>
              </div>
            </div>
            <p className="ws-notification-schedule">
              WhatsApp requires a phone number on your profile.
            </p>
          </section>
        </div>

        <div className="ws-notification-footer">
          <button className="btn-cta btn-primary" type="submit">
            Save alert preferences
          </button>
        </div>
      </form>
    </article>
  );
}
