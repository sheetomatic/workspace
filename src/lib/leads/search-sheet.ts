import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pullLeadsFromGoogleSheet } from "@/lib/leads/google-sheets";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";
import { getGoogleSheetsLeadConnection } from "@/lib/leads/queries";
import { leadMatchesSearchQuery } from "@/lib/leads/search";
import { resolveGoogleSheetsLeadConfig } from "@/lib/leads/sheet-config";
import type { ExternalLeadRow } from "@/lib/leads/sync-sources";

const SHEET_CACHE_MS = 60_000;
const MAX_IMPORT = 25;
const SEARCH_BUDGET_MS = 12_000;

type SheetCacheEntry = { at: number; rows: ExternalLeadRow[] };

const sheetRowCache = new Map<string, SheetCacheEntry>();

function cacheKey(organizationId: string, spreadsheetId: string, gid: string) {
  return `${organizationId}:${spreadsheetId}:${gid}`;
}

async function loadSheetRows(params: {
  organizationId: string;
  spreadsheetId: string;
  gid: string;
  config: Parameters<typeof pullLeadsFromGoogleSheet>[0];
}): Promise<ExternalLeadRow[]> {
  const key = cacheKey(params.organizationId, params.spreadsheetId, params.gid);
  const hit = sheetRowCache.get(key);
  if (hit && Date.now() - hit.at < SHEET_CACHE_MS) {
    return hit.rows;
  }

  const rows = await pullLeadsFromGoogleSheet(params.config);
  sheetRowCache.set(key, { at: Date.now(), rows });
  return rows;
}

function alreadyInCrm(
  row: ExternalLeadRow,
  known: { phones: Set<string>; emails: Set<string>; externalIds: Set<string> },
) {
  const externalId = row.externalId?.trim();
  if (externalId && known.externalIds.has(externalId)) {
    return true;
  }
  const phone = leadPhoneDigits(row.phone);
  if (phone && (known.phones.has(phone) || known.phones.has(phone.slice(-10)))) {
    return true;
  }
  const email = row.email?.trim().toLowerCase();
  if (email && known.emails.has(email)) {
    return true;
  }
  return false;
}

/**
 * When CRM search misses a lead that still lives only on the connected
 * Google Sheet (partial import), pull matching sheet rows into this org.
 */
export async function importSheetLeadsMatchingSearch(params: {
  organizationId: string;
  q: string;
}): Promise<{ matched: number; imported: number }> {
  const q = params.q.trim();
  if (q.length < 2) {
    return { matched: 0, imported: 0 };
  }

  const connection = await getGoogleSheetsLeadConnection(params.organizationId);
  if (!connection?.enabled) {
    return { matched: 0, imported: 0 };
  }

  const config = resolveGoogleSheetsLeadConfig(connection.config);
  if (!config) {
    return { matched: 0, imported: 0 };
  }

  const rows = await loadSheetRows({
    organizationId: params.organizationId,
    spreadsheetId: config.spreadsheetId,
    gid: config.gid,
    config,
  });

  const matches = rows.filter((row) => leadMatchesSearchQuery(row, q));
  if (matches.length === 0) {
    return { matched: 0, imported: 0 };
  }

  const lookupOr: Prisma.InboundLeadWhereInput[] = [];
  for (const row of matches.slice(0, 80)) {
    if (row.externalId?.trim()) {
      lookupOr.push({
        channel: "GOOGLE_SHEETS",
        externalId: row.externalId.trim(),
      });
    }
    const phone = leadPhoneDigits(row.phone);
    if (phone) {
      lookupOr.push({ phone: { contains: phone.slice(-10) } });
    }
    const email = row.email?.trim();
    if (email) {
      lookupOr.push({ email: { equals: email, mode: "insensitive" } });
    }
  }

  const existing =
    lookupOr.length > 0
      ? await prisma.inboundLead.findMany({
          where: {
            organizationId: params.organizationId,
            mergedIntoId: null,
            OR: lookupOr,
          },
          select: { phone: true, email: true, externalId: true },
        })
      : [];
  const known = {
    phones: new Set<string>(),
    emails: new Set<string>(),
    externalIds: new Set<string>(),
  };
  for (const lead of existing) {
    const phone = leadPhoneDigits(lead.phone);
    if (phone) {
      known.phones.add(phone);
      known.phones.add(phone.slice(-10));
    }
    if (lead.email?.trim()) {
      known.emails.add(lead.email.trim().toLowerCase());
    }
    if (lead.externalId?.trim()) {
      known.externalIds.add(lead.externalId.trim());
    }
  }

  const missing = matches.filter((row) => !alreadyInCrm(row, known)).slice(0, MAX_IMPORT);
  const deadline = Date.now() + SEARCH_BUDGET_MS;
  let imported = 0;

  for (const row of missing) {
    if (Date.now() > deadline) {
      break;
    }
    const result = await ingestInboundLead({
      organizationId: params.organizationId,
      channel: "GOOGLE_SHEETS",
      connectionId: connection.id,
      skipConnectionSetup: true,
      createFmsJob: false,
      suppressOwnerNotify: true,
      sheetPull: true,
      externalId: row.externalId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      city: row.city,
      company: row.company,
      address: row.address,
      zipCode: row.zipCode,
      requirement: row.requirement,
      sourceDetail: row.sourceDetail,
      meetingNotes: row.meetingNotes,
      callingStatus: row.callingStatus,
      capturedAt: row.capturedAt ?? undefined,
      nextFollowUpAt: row.nextFollowUpAt ?? undefined,
      status: row.status,
      rawPayload: row.raw as Prisma.InputJsonValue,
    });
    if (result.lead && !result.skipped) {
      imported += 1;
    }
  }

  return { matched: matches.length, imported };
}
