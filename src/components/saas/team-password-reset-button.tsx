"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { resetTeamMemberPassword } from "@/app/app/team/actions";

export function TeamPasswordResetButton({
  membershipId,
  memberLabel,
  disabled,
}: {
  membershipId: string;
  memberLabel: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    ok: boolean;
    message: string;
    tempPassword?: string;
  } | null>(null);

  function handleReset() {
    if (
      !window.confirm(
        `Reset password for ${memberLabel}? A new temporary password will be emailed if configured.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await resetTeamMemberPassword(membershipId);
      setMessage(result);
    });
  }

  return (
    <span className="legal-team-reset-wrap">
      <button
        aria-label={`Reset password for ${memberLabel}`}
        className="btn-ghost legal-team-reset-btn"
        disabled={disabled || pending}
        title="Reset password"
        type="button"
        onClick={handleReset}
      >
        <KeyRound aria-hidden size={14} />
        {pending ? "..." : "Reset"}
      </button>
      {message?.message ? (
        <span
          className={
            message.ok
              ? "saas-form-message ok legal-team-reset-msg"
              : "saas-form-message error legal-team-reset-msg"
          }
        >
          {message.message}
          {message.tempPassword ? ` Temp: ${message.tempPassword}` : ""}
        </span>
      ) : null}
    </span>
  );
}
