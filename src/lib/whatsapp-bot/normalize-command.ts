const GREETING_EXACT = new Set([
  "hi",
  "hii",
  "hey",
  "hello",
  "hola",
  "namaste",
  "start",
  "menu",
  "help",
  "topics",
]);

const GREETING_PREFIX = /^(hi|hello|hey|namaste)\b/;

/** Normalize free-text WhatsApp commands (trim, lowercase, strip edge punctuation). */
export function normalizeWhatsAppCommand(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function isWhatsAppGreeting(text: string) {
  const command = normalizeWhatsAppCommand(text);
  if (!command) {
    return false;
  }
  if (GREETING_EXACT.has(command)) {
    return true;
  }
  if (GREETING_PREFIX.test(command)) {
    return true;
  }
  if (/^good\s(morning|afternoon|evening|night)$/.test(command)) {
    return true;
  }
  return false;
}

export function isWhatsAppMenuCommand(text: string) {
  const command = normalizeWhatsAppCommand(text);
  return (
    command === "menu" ||
    command === "start" ||
    isWhatsAppGreeting(text)
  );
}
