/**
 * Sheetomatic WhatsApp Reseller API (wa.sheetomatic.com/ApiDocumentation)
 * Used for customer/phone discovery and wallet - not for sending messages.
 * Messaging still uses the Integration API key (Integrations/ListApikey).
 */

export type RedlavaResellerPhone = {
  phoneNumberId: string;
  displayPhoneNumber: string;
  whatsappBusinessAccountId?: string;
  active: boolean;
  customerUsername: string;
  customerId: string;
};

export type RedlavaResellerCustomer = {
  id: string;
  username: string;
  active?: boolean;
  phones: RedlavaResellerPhone[];
};

function resellerBaseUrl() {
  const configured = process.env.REDLAVA_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured && !/redlava\.in/i.test(configured)) {
    return configured;
  }
  return "https://wa.sheetomatic.com/api/v1";
}

function resellerApiKey() {
  return process.env.REDLAVA_RESELLER_API_KEY?.trim() || null;
}

function resellerHeaders() {
  const apiKey = resellerApiKey();
  if (!apiKey) {
    return null;
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
}

const RESELLER_FETCH_TIMEOUT_MS = 4_000;

async function resellerRequest(
  endpoint: string,
  init?: { method?: string; body?: unknown },
) {
  const headers = resellerHeaders();
  if (!headers) {
    return {
      ok: false as const,
      error: "Reseller API key is not configured.",
      body: {},
    };
  }

  let response: Response;
  try {
    response = await fetch(`${resellerBaseUrl()}${endpoint}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(RESELLER_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false as const,
      error: timedOut
        ? "RedLava reseller API timed out. Try again in a moment."
        : "Could not reach RedLava reseller API.",
      body: {},
    };
  }

  const raw = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    const detail =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.message === "string" && body.message) ||
      raw.slice(0, 300);
    return {
      ok: false as const,
      status: response.status,
      error: detail || `RedLava reseller request failed (${response.status}).`,
      body,
    };
  }

  return { ok: true as const, status: response.status, body, raw };
}

type WabaToken = {
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  whatsappBusinessAccountId?: string;
  active?: boolean;
};

type CustomerRecord = {
  id?: string;
  username?: string;
  active?: boolean;
  wabaTokens?: WabaToken[];
};

function mapCustomer(record: CustomerRecord): RedlavaResellerCustomer | null {
  if (!record.id || !record.username) {
    return null;
  }

  const phones = (record.wabaTokens ?? [])
    .filter((token) => token.phoneNumberId && token.displayPhoneNumber)
    .map((token) => ({
      phoneNumberId: token.phoneNumberId!,
      displayPhoneNumber: token.displayPhoneNumber!,
      whatsappBusinessAccountId: token.whatsappBusinessAccountId,
      active: token.active ?? true,
      customerUsername: record.username!,
      customerId: record.id!,
    }));

  return {
    id: record.id,
    username: record.username,
    active: record.active,
    phones,
  };
}

export function isRedlavaResellerConfigured() {
  return Boolean(resellerApiKey());
}

export async function listRedlavaResellerCustomers() {
  const listResult = await resellerRequest("/reseller/customers", {
    method: "POST",
    body: {
      pagination: { current: 1, pageSize: 100 },
      order: [],
      search: [],
    },
  });

  if (!listResult.ok) {
    return listResult;
  }

  const results = Array.isArray(listResult.body.results)
    ? listResult.body.results
    : [];

  const customers = results
    .map((item) => mapCustomer(item as CustomerRecord))
    .filter(Boolean) as RedlavaResellerCustomer[];

  const phones = customers.flatMap((customer) => customer.phones);

  return {
    ok: true as const,
    customers,
    phones,
  };
}

export async function getRedlavaResellerWallet() {
  const result = await resellerRequest("/reseller/wallet");
  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    currentPoints:
      typeof result.body.currentPoints === "number"
        ? result.body.currentPoints
        : null,
  };
}
