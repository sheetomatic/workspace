import type { InboundLead, Prisma } from "@prisma/client";
import {
  createGoogleSheetsWriteClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { prisma } from "@/lib/db";
import {
  fetchLeadsSheetRows,
  HEADER_ALIASES,
} from "@/lib/leads/google-sheets";
import { resolveGoogleSheetsLeadConfig } from "@/lib/leads/sheet-config";
import {
  CALLING_STATUS_LABELS,
  LEAD_STATUS_LABELS,
} from "@/lib/leads/status-labels";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderIndex(headers: string[]) {
  const index = new Map<string, number>();
  headers.forEach((header, position) => {
    const normalized = normalizeHeader(header);
    if (normalized) {
      index.set(normalized, position);
    }
  });
  return index;
}

function columnIndex(
  headerIndex: Map<string, number>,
  aliases: readonly string[],
) {
  for (const alias of aliases) {
    const position = headerIndex.get(alias);
    if (position !== undefined) {
      return position;
    }
  }
  return -1;
}

function formatSheetDate(value: Date | null | undefined) {
  if (!value) {
    return "";
  }
  return value.toLocaleDateString("en-IN");
}

function formatSheetDateTime(value: Date | null | undefined) {
  if (!value) {
    return "";
  }
  return value.toLocaleString("en-IN");
}

const EXPORT_ALIASES = {
  ...HEADER_ALIASES,
  quotationValue: ["quotation amount", "quotation value", "quote amount"],
  discussionNotes: ["discussion notes", "internal notes"],
  pipeValue: ["pipe value", "pipeline value"],
  projectStatus: ["project status"],
} as const;

function resolveSheetRowNumber(
  lead: Pick<InboundLead, "externalId" | "phone" | "email">,
  dataRows: string[][],
  headerIndex: Map<string, number>,
  headerRowNumber: number,
) {
  const rowMatch = lead.externalId?.match(/^sheet-row-(\d+)$/i);
  if (rowMatch) {
    return Number.parseInt(rowMatch[1]!, 10);
  }

  const phoneCol = columnIndex(headerIndex, EXPORT_ALIASES.phone);
  const emailCol = columnIndex(headerIndex, EXPORT_ALIASES.email);
  const phoneDigits = lead.phone?.replace(/\D/g, "") ?? "";
  const email = lead.email?.trim().toLowerCase() ?? "";

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index]!;
    if (phoneDigits && phoneCol >= 0) {
      const rowPhone = row[phoneCol]?.replace(/\D/g, "") ?? "";
      if (rowPhone && rowPhone === phoneDigits) {
        return headerRowNumber + index + 1;
      }
    }
    if (email && emailCol >= 0) {
      const rowEmail = row[emailCol]?.trim().toLowerCase() ?? "";
      if (rowEmail && rowEmail === email) {
        return headerRowNumber + index + 1;
      }
    }
  }

  return null;
}

function leadValuesForSheet(
  lead: InboundLead,
  headerIndex: Map<string, number>,
  row: string[],
) {
  const next = [...row];
  const pad = (col: number, value: string) => {
    if (col < 0 || !value.trim()) {
      return;
    }
    while (next.length <= col) {
      next.push("");
    }
    next[col] = value;
  };

  pad(columnIndex(headerIndex, EXPORT_ALIASES.name), lead.name ?? "");
  pad(columnIndex(headerIndex, EXPORT_ALIASES.phone), lead.phone ?? "");
  pad(columnIndex(headerIndex, EXPORT_ALIASES.email), lead.email ?? "");
  pad(columnIndex(headerIndex, EXPORT_ALIASES.company), lead.company ?? "");
  pad(columnIndex(headerIndex, EXPORT_ALIASES.address), lead.address ?? "");
  pad(columnIndex(headerIndex, EXPORT_ALIASES.zipCode), lead.zipCode ?? "");
  pad(columnIndex(headerIndex, EXPORT_ALIASES.requirement), lead.requirement ?? "");
  pad(
    columnIndex(headerIndex, EXPORT_ALIASES.status),
    LEAD_STATUS_LABELS[lead.status],
  );
  pad(
    columnIndex(headerIndex, EXPORT_ALIASES.meetingNotes),
    lead.meetingNotes ?? "",
  );
  pad(
    columnIndex(headerIndex, EXPORT_ALIASES.callingStatus),
    CALLING_STATUS_LABELS[lead.callingStatus],
  );
  pad(
    columnIndex(headerIndex, EXPORT_ALIASES.nextFollowUp),
    formatSheetDateTime(lead.nextFollowUpAt),
  );
  pad(
    columnIndex(headerIndex, EXPORT_ALIASES.discussionNotes),
    lead.discussionNotes ?? "",
  );
  if (lead.quotationValue != null) {
    pad(
      columnIndex(headerIndex, EXPORT_ALIASES.quotationValue),
      String(Number(lead.quotationValue)),
    );
  }
  if (lead.pipeValue != null) {
    pad(
      columnIndex(headerIndex, EXPORT_ALIASES.pipeValue),
      String(Number(lead.pipeValue)),
    );
  }
  pad(
    columnIndex(headerIndex, EXPORT_ALIASES.capturedAt),
    formatSheetDateTime(lead.capturedAt ?? lead.createdAt),
  );

  return next;
}

async function resolveSheetConnection(organizationId: string) {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId,
        channel: "GOOGLE_SHEETS",
      },
    },
  });

  if (!connection?.enabled) {
    throw new Error("Google Sheets sync is not enabled.");
  }

  const config = resolveGoogleSheetsLeadConfig(connection.config);
  if (!config) {
    throw new Error("Add a spreadsheet URL in Google Sheets settings.");
  }

  return { connection, config };
}

export async function exportLeadsToGoogleSheet(organizationId: string) {
  if (!isGoogleSheetsAuthConfigured()) {
    throw new Error(
      "Google Sheets export requires service account credentials on the server.",
    );
  }

  const sheets = createGoogleSheetsWriteClient();
  if (!sheets) {
    throw new Error("Could not connect to Google Sheets.");
  }

  const { config } = await resolveSheetConnection(organizationId);
  const fetched = await fetchLeadsSheetRows(config);
  const headerRowNumber = config.headerRow ?? 1;
  const headers = fetched.rows[headerRowNumber - 1] ?? [];
  const headerIndex = buildHeaderIndex(headers);
  const dataRows = fetched.rows.slice(headerRowNumber);

  const leads = await prisma.inboundLead.findMany({
    where: { organizationId, channel: "GOOGLE_SHEETS" },
    orderBy: { createdAt: "asc" },
  });

  const sheetTitle =
    fetched.sheetTitle ??
    config.sheetTab ??
    "Form Responses 1";
  const quotedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;

  let exported = 0;
  const updates: Array<{ range: string; values: string[][] }> = [];

  for (const lead of leads) {
    const rowNumber = resolveSheetRowNumber(
      lead,
      dataRows,
      headerIndex,
      headerRowNumber,
    );
    if (!rowNumber) {
      continue;
    }

    const rowIndex = rowNumber - headerRowNumber - 1;
    const existingRow = dataRows[rowIndex] ?? [];
    const values = [leadValuesForSheet(lead, headerIndex, existingRow)];
    const lastCol = Math.max(headers.length, values[0]?.length ?? 1, 1);
    const endCol = columnIndexToLetter(lastCol - 1);

    updates.push({
      range: `${quotedTitle}!A${rowNumber}:${endCol}${rowNumber}`,
      values,
    });
    exported += 1;
  }

  if (updates.length === 0) {
    return { exported: 0, spreadsheetId: fetched.spreadsheetId };
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: fetched.spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });

  return { exported, spreadsheetId: fetched.spreadsheetId };
}

export async function pushLeadToGoogleSheet(
  organizationId: string,
  leadId: string,
) {
  try {
    const lead = await prisma.inboundLead.findFirst({
      where: { id: leadId, organizationId, channel: "GOOGLE_SHEETS" },
    });
    if (!lead) {
      return { ok: false as const, reason: "not_sheet_lead" as const };
    }
    await exportLeadsToGoogleSheet(organizationId);
    return { ok: true as const };
  } catch (error) {
    console.error("[leads-sheet-export]", error);
    return {
      ok: false as const,
      reason: "export_failed" as const,
      message: error instanceof Error ? error.message : "Sheet export failed.",
    };
  }
}

export async function syncLeadsTwoWay(organizationId: string) {
  const { pullLeadsFromConnection } = await import("@/lib/leads/sync-sources");
  const pull = await pullLeadsFromConnection({
    organizationId,
    channel: "GOOGLE_SHEETS",
  });

  if (!pull.ok) {
    return pull;
  }

  try {
    const pushed = await exportLeadsToGoogleSheet(organizationId);
    return {
      ok: true as const,
      imported: pull.imported,
      counts: pull.counts,
      partial: pull.partial,
      exported: pushed.exported,
    };
  } catch (error) {
    return {
      ok: false as const,
      reason: "export_failed" as const,
      message:
        error instanceof Error
          ? error.message
          : "Imported from sheet but could not export CRM fields back.",
    };
  }
}

function columnIndexToLetter(index: number) {
  let value = index + 1;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

export const resolveSheetRowNumberForTests = resolveSheetRowNumber;
