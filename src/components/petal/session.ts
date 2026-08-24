import { loginByPhone, type Role } from "./data";

const KEY = "sbp-session";

export type Session = { role: Role; id: string; phone: string };

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (!s) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(s));
}

export function tryLogin(phone: string, pin: string): Session | null {
  const hit = loginByPhone(phone.replace(/\D/g, ""), pin);
  if (!hit) return null;
  const s = { ...hit, phone: phone.replace(/\D/g, "") };
  writeSession(s);
  return s;
}
