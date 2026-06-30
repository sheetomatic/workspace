const IST = "Asia/Kolkata";

function getDateParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    ...options,
  }).formatToParts(date);
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

/** Stable long date for dashboards — avoids SSR/client locale punctuation drift. */
export function formatIndianGreetingDate(date: Date): string {
  const parts = getDateParts(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${readPart(parts, "weekday")}, ${readPart(parts, "day")} ${readPart(parts, "month")} ${readPart(parts, "year")}`;
}

export function formatIndianGreetingTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
