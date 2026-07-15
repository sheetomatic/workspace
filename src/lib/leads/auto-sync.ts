import { withDbRetry } from "@/lib/db";
import { syncLeadsTwoWay } from "@/lib/leads/google-sheets-export";
import { pullLeadsFromConnection } from "@/lib/leads/sync-sources";
import { readSheetSyncProgress } from "@/lib/leads/sheet-sync-progress";

const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** Sync Google Sheets if import is in progress or last sync is older than 15 minutes. */
export async function maybeAutoSyncGoogleSheets(organizationId: string) {
  const connection = await withDbRetry((client) =>
    client.leadIngestConnection.findUnique({
      where: {
        organizationId_channel: {
          organizationId,
          channel: "GOOGLE_SHEETS",
        },
      },
    }),
  );

  if (!connection?.enabled) {
    return { synced: false as const, reason: "disabled" as const };
  }

  const inProgress = readSheetSyncProgress(connection.config);
  const lastSyncAt = connection.lastSyncAt?.getTime() ?? 0;

  // Always continue a partial import when someone opens CRM — do not wait 15 min.
  if (inProgress) {
    const result = await pullLeadsFromConnection({
      organizationId,
      channel: "GOOGLE_SHEETS",
    });
    return {
      synced: result.ok,
      reason: result.ok ? ("continued" as const) : ("error" as const),
      imported: result.ok ? result.imported : 0,
      error: result.ok ? undefined : result.reason,
    };
  }

  if (Date.now() - lastSyncAt < AUTO_SYNC_INTERVAL_MS) {
    return { synced: false as const, reason: "fresh" as const };
  }

  const result = await syncLeadsTwoWay(organizationId);

  return {
    synced: result.ok,
    reason: result.ok ? ("synced" as const) : ("error" as const),
    imported: result.ok ? result.imported : 0,
    error: result.ok ? undefined : result.reason,
  };
}

export const LEADS_SYNC_INTERVAL_LABEL = "every 15 min";
