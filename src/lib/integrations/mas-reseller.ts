/**
 * Web Based API reseller: list customers, add credits, extend validity.
 * Uses MAS_RESELLER_API_KEY. Do not show vendor branding in UI.
 */

import { masBaseUrl } from "@/lib/integrations/messageautosender";
import { normalizeWhatsAppPhone } from "@/lib/phone";

function expiryYmd(raw: string | null) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export type MasResellerCustomer = {
  externalId: string | null;
  username: string;
  phone: string | null;
  email: string | null;
  accountGroup: "REGULAR" | "INACTIVE";
  creditPoints: number;
  expiresAt: string | null;
};

function resellerKey() {
  return process.env.MAS_RESELLER_API_KEY?.trim() || null;
}

export function isMasResellerConfigured() {
  return Boolean(resellerKey());
}

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function looksLikeCustomer(value: unknown) {
  const row = record(value);
  if (!row) return false;
  return Boolean(
    pickString(row.username) ||
      pickString(row.userName) ||
      pickString(row.mobile) ||
      pickString(row.contact) ||
      pickString(row.phone),
  );
}

export function extractMasResellerCustomers(payload: unknown): unknown[] {
  const found: unknown[] = [];

  function walk(value: unknown, depth: number) {
    if (depth > 6 || value == null) return;
    if (Array.isArray(value)) {
      if (value.length && value.every(looksLikeCustomer)) {
        found.push(...value);
        return;
      }
      for (const item of value) walk(item, depth + 1);
      return;
    }
    const row = record(value);
    if (!row) return;
    if (looksLikeCustomer(row) && (row.username || row.mobile || row.contact)) {
      found.push(row);
    }
    for (const child of Object.values(row)) walk(child, depth + 1);
  }

  walk(payload, 0);
  return found;
}

export function parseMasResellerCustomer(value: unknown): MasResellerCustomer | null {
  const row = record(value);
  if (!row) return null;
  const username =
    pickString(row.username) || pickString(row.userName) || pickString(row.name);
  if (!username || username.length < 2) return null;

  const phoneRaw =
    pickString(row.mobile) ||
    pickString(row.contact) ||
    pickString(row.phone) ||
    pickString(row.whatsappNumber);
  const phone = phoneRaw ? normalizeWhatsAppPhone(phoneRaw) : null;
  const id = pickNumber(row.id) ?? pickString(row.id);
  const credits =
    pickNumber(row.creditPoints) ??
    pickNumber(row.creditPoint) ??
    pickNumber(row.credits) ??
    0;
  const expiryRaw =
    pickString(row.validUpto) ||
    pickString(row.validUntil) ||
    pickString(row.activeUpto) ||
    pickString(row.expiryDate);
  const accountType = (pickString(row.accountType) || pickString(row.status) || "").toLowerCase();

  return {
    externalId: id != null ? String(id) : null,
    username,
    phone,
    email: pickString(row.email),
    accountGroup: accountType === "regular" || accountType === "active" ? "REGULAR" : "INACTIVE",
    creditPoints: Math.max(0, Math.round(credits)),
    expiresAt: expiryYmd(expiryRaw),
  };
}

function parseBody(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

function masErrorMessage(status: number, body: Record<string, unknown>, raw: string) {
  return (
    pickString(body.message) ||
    pickString(body.error) ||
    raw.slice(0, 180) ||
    `Request failed (${status}).`
  );
}

function looksSuccessful(status: number, body: Record<string, unknown>, raw: string) {
  if (status < 200 || status >= 300) return false;
  const message = `${pickString(body.message) ?? ""} ${raw}`.toLowerCase();
  if (/unauthorized|forbidden|invalid api|not found|does not exist/.test(message)) {
    return false;
  }
  return true;
}

async function resellerRequest(
  path: string,
  init?: { method?: "GET" | "POST"; body?: Record<string, unknown> },
) {
  const key = resellerKey();
  if (!key) {
    return {
      ok: false as const,
      status: 0,
      body: {},
      raw: "",
      error: "Web Based API reseller key is not configured on the server.",
    };
  }

  const method = init?.method ?? "POST";
  const url = `${masBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: method === "POST" ? JSON.stringify(init?.body ?? {}) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.text();
  const body = parseBody(raw);
  if (!looksSuccessful(response.status, body, raw)) {
    return {
      ok: false as const,
      status: response.status,
      body,
      raw,
      error: masErrorMessage(response.status, body, raw),
    };
  }
  return { ok: true as const, status: response.status, body, raw };
}

const LIST_ATTEMPTS: Array<{ path: string; method: "GET" | "POST"; body?: Record<string, unknown> }> =
  [
    { path: "/reseller/customer/search", method: "POST", body: { page: 0, size: 500 } },
    { path: "/reseller/customer/list", method: "POST", body: { page: 0, size: 500 } },
    { path: "/reseller/customer/search", method: "GET" },
    { path: "/reseller/customer/list", method: "GET" },
    { path: "/reseller/customers", method: "GET" },
    { path: "/reseller/customer", method: "GET" },
  ];

export async function listMasResellerCustomers(): Promise<
  | { ok: true; customers: MasResellerCustomer[] }
  | { ok: false; error: string }
> {
  if (!isMasResellerConfigured()) {
    return { ok: false, error: "Web Based API reseller key is not configured on the server." };
  }

  let lastError = "Could not load customers from the Web Based API panel.";
  for (const attempt of LIST_ATTEMPTS) {
    const result = await resellerRequest(attempt.path, {
      method: attempt.method,
      body: attempt.body,
    });
    if (!result.ok) {
      lastError = result.error;
      continue;
    }
    const parsed = extractMasResellerCustomers(result.body)
      .map(parseMasResellerCustomer)
      .filter((row): row is MasResellerCustomer => Boolean(row));
    if (parsed.length) {
      const unique = new Map<string, MasResellerCustomer>();
      for (const row of parsed) {
        unique.set(row.externalId || row.username.toLowerCase(), row);
      }
      return { ok: true, customers: [...unique.values()] };
    }
  }

  return { ok: false, error: lastError };
}

export async function addMasResellerCredits(input: {
  username: string;
  externalId?: string | null;
  credits: number;
}) {
  const credits = Math.round(input.credits);
  if (!Number.isFinite(credits) || credits < 1 || credits > 1_000_000) {
    return { ok: false as const, error: "Enter credits between 1 and 1,000,000." };
  }

  const bodies: Record<string, unknown>[] = [
    { customerUsername: input.username, creditPoints: credits },
    { username: input.username, creditPoints: credits },
    { customerUsername: input.username, credits },
    ...(input.externalId
      ? [
          { customerId: Number(input.externalId) || input.externalId, creditPoints: credits },
          { id: Number(input.externalId) || input.externalId, creditPoints: credits },
        ]
      : []),
  ];
  const paths = [
    "/reseller/customer/addCredit",
    "/reseller/customer/addCredits",
    "/reseller/customer/credit/add",
  ];

  let lastError = "Panel did not accept the credit update.";
  for (const path of paths) {
    for (const body of bodies) {
      const result = await resellerRequest(path, { method: "POST", body });
      if (result.ok) {
        return { ok: true as const, message: `Added ${credits} credits on the panel.` };
      }
      lastError = result.error;
    }
  }
  return { ok: false as const, error: lastError };
}

export async function updateMasResellerValidity(input: {
  username: string;
  externalId?: string | null;
  validUpto: string;
}) {
  const validUpto = input.validUpto.trim();
  if (!validUpto) {
    return { ok: false as const, error: "Pick a recharge-by date." };
  }

  const bodies: Record<string, unknown>[] = [
    { customerUsername: input.username, validUpto },
    { username: input.username, validUpto },
    { customerUsername: input.username, validUntil: validUpto },
    ...(input.externalId
      ? [{ customerId: Number(input.externalId) || input.externalId, validUpto }]
      : []),
  ];
  const paths = [
    "/reseller/customer/updateValidity",
    "/reseller/customer/validity",
    "/reseller/customer/recharge",
    "/reseller/customer/update",
  ];

  let lastError = "Panel did not accept the recharge date.";
  for (const path of paths) {
    for (const body of bodies) {
      const result = await resellerRequest(path, { method: "POST", body });
      if (result.ok) {
        return { ok: true as const, message: `Recharged on the panel until ${validUpto.slice(0, 10)}.` };
      }
      lastError = result.error;
    }
  }
  return { ok: false as const, error: lastError };
}
