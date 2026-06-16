"use client";

import { useActionState } from "react";
import { sendTestAlertEmailAction } from "@/app/app/settings/notification-actions";

type TestEmailState = {
  ok: boolean;
  message: string;
} | null;

const initialState: TestEmailState = null;

export function NotificationTestEmailButton({
  emailConfigured,
  alertViaEmail,
}: {
  emailConfigured: boolean;
  alertViaEmail: boolean;
}) {
  const [state, action, pending] = useActionState(
    sendTestAlertEmailAction,
    initialState,
  );

  if (!emailConfigured) {
    return null;
  }

  return (
    <div className="ws-notification-test-wrap">
      <form action={action}>
        <button
          className="btn-cta btn-secondary"
          disabled={pending || !alertViaEmail}
          title={
            alertViaEmail
              ? "Send a sample digest to your login email"
              : "Enable Email under Delivery first"
          }
          type="submit"
        >
          {pending ? "Sending..." : "Send test email"}
        </button>
      </form>
      {state ? (
        <p
          className={`ws-notification-test-result ${state.ok ? "is-ok" : "is-error"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
