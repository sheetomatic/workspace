export function humanizeReminderSummary(summary: string): string {
  if (!summary.trim()) {
    return "";
  }

  return summary
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      switch (part) {
        case "email":
          return "Email sent";
        case "WhatsApp":
          return "WA sent";
        case "email not configured":
          return "Email skipped (not set up)";
        case "email failed":
          return "Email could not be sent";
        case "WhatsApp not configured":
        case "WA not configured":
          return "WA skipped (not set up)";
        case "WhatsApp failed":
          return "WA could not be sent";
        case "WhatsApp: no phone":
          return "WA skipped (no phone on assignee)";
        default:
          return part;
      }
    })
    .join(". ");
}

export function buildAssignSuccessMessage(
  base: string,
  reminderSummary: string,
): string {
  const human = humanizeReminderSummary(reminderSummary);
  if (!human) {
    return base;
  }
  return `${base} ${human}.`;
}
