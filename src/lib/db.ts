import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Delegates that must exist after recent schema changes (dev hot-reload guard). */
const REQUIRED_DELEGATES = [
  "organization",
  "user",
  "membership",
  "delegatedTask",
  "whatsAppTemplate",
  "workspaceWhatsAppSettings",
  "workspaceMetricCard",
  "workspaceFollowUp",
  "workspacePendingPayment",
  "workspaceApproval",
  "workspaceLink",
  "rateLimitBucket",
  "userNotificationSettings",
  "legalCase",
  "legalCaseDocument",
  "imsItem",
  "imsMaterialRequisition",
  "imsIndent",
  "imsPurchaseOrder",
  "imsPurchaseBill",
  "imsRackSection",
  "imsPhysicalStockCount",
  "imsGatePass",
  "orgExpenseEntry",
] as const;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
  });
}

function resolveDatabaseUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) {
    return base;
  }
  if (base.includes("connection_limit=")) {
    return base;
  }

  const isDev = process.env.NODE_ENV === "development";
  const limit =
    process.env.DATABASE_CONNECTION_LIMIT ?? (isDev ? "10" : "5");
  const poolTimeout =
    process.env.DATABASE_POOL_TIMEOUT ?? (isDev ? "30" : "30");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}connection_limit=${limit}&pool_timeout=${poolTimeout}`;
}

function isStalePrismaClient(client: PrismaClient) {
  return REQUIRED_DELEGATES.some(
    (delegate) => !(delegate in client),
  );
}

function resolvePrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && !isStalePrismaClient(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const fresh = createPrismaClient();
  // Cache in production too — one client per serverless isolate. Skipping
  // this opened a new pool on every query and the login org list 503'd.
  globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = resolvePrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

/** Call after schema changes in dev if queries fail with unknown fields. */
export async function reconnectPrisma() {
  const current = globalForPrisma.prisma;
  if (current) {
    await current.$disconnect();
  }
  const fresh = createPrismaClient();
  globalForPrisma.prisma = fresh;
  return fresh;
}

function isConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: string }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    // P1001 = can't reach DB, P1017 = server closed connection, P2024 = pool timeout
    if (
      code === "P2024" ||
      code === "P1001" ||
      code === "P1017" ||
      code === "P1002" ||
      code === "P1008"
    ) {
      return true;
    }
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("can't reach database") ||
    message.includes("cant reach database") ||
    message.includes("could not connect") ||
    message.includes("closed") ||
    message.includes("connection") ||
    message.includes("pool timeout") ||
    message.includes("timed out") ||
    message.includes("timeout exceeded") ||
    message.includes("p1001") ||
    message.includes("p1017") ||
    message.includes("p2024") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("socket") ||
    message.includes("server has closed the connection") ||
    message.includes("response from the engine was empty") ||
    message.includes("engine is not yet connected") ||
    message.includes("prismaclientinitializationerror") ||
    message.includes("prismaclientunknownrequesterror")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry on Neon cold-start / pool flaps. Default: 3 attempts with backoff
 * (0ms → ~400ms → ~1200ms) and a fresh Prisma client between tries.
 */
export async function withDbRetry<T>(
  fn: (client: PrismaClient) => Promise<T>,
  options?: { attempts?: number },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(resolvePrismaClient());
    } catch (error) {
      lastError = error;
      if (!isConnectionError(error) || attempt === attempts) {
        throw error;
      }
      console.warn(
        `[db] connection error (attempt ${attempt}/${attempts}), retrying…`,
        error instanceof Error ? error.message : error,
      );
      try {
        await reconnectPrisma();
      } catch {
        // ignore disconnect failures — next attempt creates a fresh client
      }
      // Neon compute wake can take 1–3s; give it a beat before retrying.
      await sleep(350 * attempt * attempt);
    }
  }

  throw lastError;
}
