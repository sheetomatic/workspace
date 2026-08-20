"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendEmployeeDocsLinkAction } from "@/lib/hr/hr-actions";

export function EmployeeDocsLinkActions({
  employeeProfileId,
  hasPhone,
  compact = false,
}: {
  employeeProfileId: string;
  hasPhone: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function send(channel: "email" | "whatsapp") {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const fd = new FormData();
      fd.set("employeeProfileId", employeeProfileId);
      fd.set("channel", channel);
      const result = await sendEmployeeDocsLinkAction(fd);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(result.message);
      if (result.waMeUrl) {
        window.open(result.waMeUrl, "_blank", "noopener,noreferrer");
      }
      router.refresh();
    });
  }

  return (
    <div className={compact ? "ws-hr-row-docs" : "ws-hr-docs-link-block"}>
      <div className="ws-hr-row-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={pending}
          onClick={() => send("email")}
        >
          {pending ? "Sending…" : "Email link"}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={pending || !hasPhone}
          title={hasPhone ? "Send on WhatsApp" : "Add a phone number first"}
          onClick={() => send("whatsapp")}
        >
          WhatsApp
        </button>
      </div>
      {message ? (
        <p
          className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"}
          role="status"
        >
          {message}
        </p>
      ) : compact ? null : (
        <p className="ws-apple-cell-secondary">
          Sends a 14-day link so they can upload pending docs, save as draft, then
          submit.
        </p>
      )}
    </div>
  );
}
