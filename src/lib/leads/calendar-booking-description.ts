/** Google event descriptions may contain HTML. Extract labelled booking data, never render raw HTML. */
export function parseCalendarBookingDescription(description?: string) {
  const text = (description ?? "").slice(0, 16_000)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, name: string) =>
      ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[name.toLowerCase()] ?? "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const value = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      return value >= 32 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : " ";
    })
    .replace(/\r/g, "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "");
  const field = (label: string) => text.match(new RegExp(`^[ \\t]*${label}[ \\t]*:[ \\t]*([^\\n]+)`, "im"))?.[1].trim() || null;
  const customerName = field("Customer name")?.slice(0, 160) ?? null;
  const rawPhone = field("Customer phone");
  let digits = rawPhone && /^\+?[\d\s().-]+$/.test(rawPhone) ? rawPhone.replace(/\D/g, "") : "";
  if (digits.length === 10 && /^[6-9]/.test(digits)) digits = `91${digits}`;
  const customerPhone = /^[1-9]\d{10,14}$/.test(digits) ? `+${digits}` : null;
  // Only the customer fields are imported. Host phone/chat links are deliberately not copied.
  const requirement = field("Requirement Notes")?.slice(0, 2000) ?? null;
  const location = field("Location")?.slice(0, 300) ?? null;
  const notes = [requirement && `Requirement: ${requirement}`, location && `Location: ${location}`].filter(Boolean).join("\n") || null;
  return { customerName, customerPhone, notes };
}

export function matchesBookingTitle(summary: string, titles: string[], customerName: string | null) {
  const title = summary.trim();
  if (titles.includes(title)) return true;
  const separator = title.lastIndexOf("|");
  if (separator < 1 || !customerName) return false;
  const name = title.slice(0, separator).trim();
  // No fuzzy/substr match: only the configured schedule title and the labelled customer's name.
  return name.toLocaleLowerCase("en-IN") === customerName.toLocaleLowerCase("en-IN") &&
    titles.includes(title.slice(separator + 1).trim());
}
