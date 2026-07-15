"use client";

/** Inline success/error banner used across HRMS after actions. */
export function HrFeedbackBanner({
  message,
  isError = false,
}: {
  message: string | null | undefined;
  isError?: boolean;
}) {
  if (!message) {
    return null;
  }
  return (
    <p
      className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"}
      role={isError ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
