import { prisma } from "@/lib/db";
import { pullLeadsFromConnection } from "@/lib/leads/sync-sources";

const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** Sync Google Sheets if last sync is older than 15 minutes. */
export async function maybeAutoSyncGoogleSheets(organizationId: string) {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId,
        channel: "GOOGLE_SHEETS",
      },
    },
  });

  if (!connection?.enabled) {
    return { synced: false as const, reason: "disabled" as const };
  }

  const lastSyncAt = connection.lastSyncAt?.getTime() ?? 0;
  if (Date.now() - lastSyncAt < AUTO_SYNC_INTERVAL_MS) {
    return { synced: false as const, reason: "fresh" as const };
  }

  const result = await pullLeadsFromConnection({
    organizationId,
    channel: "GOOGLE_SHEETS",
  });

  return {
    synced: result.ok,
    reason: result.ok ? ("synced" as const) : ("error" as const),
    imported: result.ok ? result.imported : 0,
    error: result.ok ? undefined : result.reason,
  };
}

export const LEADS_SYNC_INTERVAL_LABEL = "every 15 min";
