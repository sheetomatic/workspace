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
          return "WA skipped — add API key and active Cloud Phone ID in AI Settings";
        case "WhatsApp failed":
          return "WA could not be sent (check Channels settings or assignee must message your WA number first)";
        case "WhatsApp session required":
          return "WA could not be sent (assignee must message your business number once, or check wa.sheetomatic.com wallet/API)";
        case "WhatsApp: no phone":
          return "WA skipped (add WhatsApp number in Team for assignee)";
        case "WhatsApp invalid phone":
          return "WA skipped (invalid phone number on assignee)";
        default:
          if (part.startsWith("WhatsApp failed:")) {
            const detail = part.replace(/^WhatsApp failed:\s*/, "");
            if (
              detail.toLowerCase().includes("unspecified_phone_number") ||
              detail.toLowerCase().includes("multiple phone numbers")
            ) {
              return "WA error: Phone ID missing or wrong — use the active Cloud line from wa.sheetomatic.com → Connected Accounts";
            }
            if (detail.toLowerCase().includes("payment_required")) {
              return "WA error: Phone ID expired — switch to your active Cloud account on wa.sheetomatic.com";
            }
            if (detail.includes('"status":500') || detail.includes("Internal Server Error")) {
              return "WA error: Sheetomatic WhatsApp API error — retry or check wa.sheetomatic.com wallet";
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
