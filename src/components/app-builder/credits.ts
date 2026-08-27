const KEY = "sm-appbuilder-credits";
export const WELCOME_CREDITS = 40;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readCredits(): number {
  if (!canUseStorage()) return WELCOME_CREDITS;
  const raw = window.localStorage.getItem(KEY);
  if (raw == null || raw === "") {
    window.localStorage.setItem(KEY, String(WELCOME_CREDITS));
    return WELCOME_CREDITS;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : WELCOME_CREDITS;
}

export function spendCredit(): number {
  const next = Math.max(0, readCredits() - 1);
  if (canUseStorage()) {
    window.localStorage.setItem(KEY, String(next));
  }
  return next;
}

export function addCredits(n: number): number {
  const next = readCredits() + n;
  if (canUseStorage()) {
    window.localStorage.setItem(KEY, String(next));
  }
  return next;
}
