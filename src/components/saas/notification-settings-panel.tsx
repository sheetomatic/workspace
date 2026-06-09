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
      <h3>Alerts &amp; reminders</h3>
      <p className="saas-panel-lead">
        Choose when to be notified about upcoming hearings, due dates, and overdue
        items in this workspace. Alerts are sent by the daily reminder job when
        email or WhatsApp is configured.
      </p>
      <form action={saveNotificationSettingsAction} className="ws-hr-form">
        <fieldset className="ws-notification-fieldset">
          <legend>Legal cases</legend>
          <label className="ws-hr-checkbox">
            <input
              defaultChecked={settings.caseDueDateAlert}
              name="caseDueDateAlert"
              type="checkbox"
            />
            Alert on next hearing / due date
          </label>
          <label className="ws-hr-checkbox">
            <input
              defaultChecked={settings.caseOverdueAlert}
              name="caseOverdueAlert"
              type="checkbox"
            />
            Alert on overdue hearings
          </label>
        </fieldset>

        <fieldset className="ws-notification-fieldset">
          <legend>Tasks</legend>
          <label className="ws-hr-checkbox">
            <input
              defaultChecked={settings.taskDueDateAlert}
              name="taskDueDateAlert"
              type="checkbox"
            />
            Alert on task due date
          </label>
          <label className="ws-hr-checkbox">
            <input
              defaultChecked={settings.taskOverdueAlert}
              name="taskOverdueAlert"
              type="checkbox"
            />
            Alert on overdue tasks
          </label>
        </fieldset>

        <label>
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

        <fieldset className="ws-notification-fieldset">
          <legend>Channels</legend>
          <label className="ws-hr-checkbox">
            <input
              defaultChecked={settings.alertViaEmail}
              name="alertViaEmail"
              type="checkbox"
            />
            Email
          </label>
          <label className="ws-hr-checkbox">
            <input
              defaultChecked={settings.alertViaWhatsApp}
              name="alertViaWhatsApp"
              type="checkbox"
            />
            WhatsApp (requires phone on your profile)
          </label>
        </fieldset>

        <div className="form-actions">
          <button className="btn-cta btn-primary" type="submit">
            Save alert preferences
          </button>
        </div>
      </form>
    </article>
  );
}
