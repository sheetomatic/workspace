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
          return "WA could not be sent (check Channels settings or assignee must message your WA number first)";
        case "WhatsApp session required":
          return "WA could not be sent (assignee must message your business number once, or add an approved task template in Channels)";
        case "WhatsApp: no phone":
          return "WA skipped (add WhatsApp number in Team for assignee)";
        case "WhatsApp invalid phone":
          return "WA skipped (invalid phone number on assignee)";
        default:
          if (part.startsWith("WhatsApp failed:")) {
            const detail = part.replace(/^WhatsApp failed:\s*/, "");
            if (detail.includes('"status":500') || detail.includes("Internal Server Error")) {
              return "WA error: RedLava server error — template language must be en for assign_task_new";
            }
            return `WA error: ${detail}`;
          }
          if (part.startsWith("email failed:")) {
            return part.replace(/^email failed:\s*/, "Email error: ");
          }
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
