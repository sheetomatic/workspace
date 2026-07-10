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
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = fresh;
  }
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
    if (code === "P2024" || code === "P1001" || code === "P1017") {
      return true;
    }
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("closed") ||
    message.includes("connection") ||
    message.includes("pool timeout") ||
    message.includes("p1001") ||
    message.includes("p1017") ||
    message.includes("p2024") ||
    message.includes("econnreset") ||
    message.includes("socket") ||
    message.includes("response from the engine was empty") ||
    message.includes("engine is not yet connected") ||
    message.includes("prismaclientunknownrequesterror")
  );
}

/** Retry once after reconnect when Neon closes idle dev connections. */
export async function withDbRetry<T>(
  fn: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  const client = resolvePrismaClient();

  try {
    return await fn(client);
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }

    await reconnectPrisma();
    return fn(resolvePrismaClient());
  }
}
