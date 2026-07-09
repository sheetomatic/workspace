import type { InboundLeadStatus, LeadCallingStatus } from "@prisma/client";
import {
  createGoogleSheetsClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { parseSheetDate } from "@/lib/integrations/google-sheets-parse";
import { extractSheetGid, extractSpreadsheetId } from "@/lib/integrations/resolve-sheet-id";
import { parseCsv } from "@/lib/legal-cases/import-csv";
import { mapSheetStageToStatus } from "@/lib/leads/stage-ai";
import type { ExternalLeadRow } from "@/lib/leads/sync-sources";
import {
  defaultGoogleSheetsLeadConfig,
  resolveGoogleSheetsLeadConfig,
  type GoogleSheetsLeadConfig,
} from "@/lib/leads/sheet-config";

export const HEADER_ALIASES = {
  externalId: ["id", "lead id", "lead_id", "s.no", "s no", "sr no", "sr. no", "row"],
  capturedAt: [
    "date",
    "lead date",
    "created",
    "created at",
    "timestamp",
    "time",
    "submitted",
    "last contacted at",
  ],
  name: [
    "name",
    "lead name",
    "customer",
    "client",
    "contact name",
    "full name",
    "clients name",
    "client name",
  ],
  phone: [
    "phone",
    "mobile",
    "contact",
    "whatsapp",
    "phone number",
    "contact number",
    "whats app number",
  ],
  email: ["email", "e-mail", "mail", "email address"],
  city: ["city", "location", "area", "place"],
  company: ["company", "organization", "organization name", "business"],
  role: [
    "are you business owner or staff?",
    "business owner or staff",
    "role",
    "designation",
  ],
  requirement: [
    "requirement",
    "requirement description",
    "client requirement",
    "message",
    "notes",
    "query",
    "product",
    "description",
    "remarks",
    "need",
  ],
  sourceDetail: ["source", "campaign", "channel", "form", "ad", "medium"],
  status: ["status", "stage", "pipeline", "next step", "next stage"],
  nextFollowUp: [
    "next followup date",
    "next follow up date",
    "next follow-up date",
    "follow up date",
  ],
  meetingNotes: ["meeting notes", "discussion notes", "call remarks"],
  callingStatus: ["calling status", "call status"],
  address: ["address"],
  zipCode: ["zip", "zip code", "pincode", "pin code"],
} as const;

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

function cellAt(row: string[], index: number) {
  if (index < 0) {
    return "";
  }
  return row[index]?.trim() ?? "";
}

function mapSheetStatus(value: string): InboundLeadStatus | undefined {
  const fromStage = mapSheetStageToStatus(value);
  if (fromStage) {
    return fromStage;
  }

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, InboundLeadStatus> = {
    NEW: "NEW",
    SCHEDULE_MEETING: "SCHEDULE_MEETING",
    MEETING_NOTES: "MEETING_NOTES",
    CONTACTED: "CONTACTED",
    FOLLOW_UP: "FOLLOW_UP",
    FOLLOWUP: "FOLLOW_UP",
    QUALIFIED: "QUALIFIED",
    PROPOSAL: "PROPOSAL",
    INVOICE: "INVOICE",
    PROPOSAL_INVOICE: "PROPOSAL",
    PAYMENT: "PAYMENT",
    PROJECT_ACTIVE: "PROJECT_ACTIVE",
    WON: "WON",
    CLOSED_WON: "WON",
    LOST: "LOST",
    CLOSED_LOST: "LOST",
  };
  return map[normalized];
}

function mapSheetCallingStatus(value: string): LeadCallingStatus | undefined {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, LeadCallingStatus> = {
    "not called": "NOT_CALLED",
    calling: "CALLING",
    "no answer": "NO_ANSWER",
    "no an": "NO_ANSWER",
    connected: "CONNECTED",
    "not interested": "NOT_INTERESTED",
  };
  for (const [key, status] of Object.entries(map)) {
    if (normalized.startsWith(key)) {
      return status;
    }
  }
  return undefined;
}

function stableExternalId(params: {
  externalIdRaw: string;
  capturedAtRaw: string;
  phone: string;
  email: string;
  rowNumber: number;
}) {
  if (params.externalIdRaw) {
    return params.externalIdRaw;
  }

  const phoneDigits = params.phone.replace(/\D/g, "");
  const parsedAt = params.capturedAtRaw.trim()
    ? parseSheetDate(params.capturedAtRaw)
    : null;
  const timestampKey = parsedAt
    ? parsedAt.toISOString()
    : params.capturedAtRaw.trim().toLowerCase().replace(/\s+/g, "-");
  if (timestampKey && phoneDigits) {
    return `sheet-${timestampKey}-${phoneDigits}`;
  }
  if (timestampKey && params.email) {
    return `sheet-${timestampKey}-${params.email.trim().toLowerCase()}`;
  }

  return `sheet-row-${params.rowNumber}`;
}

export function parseLeadsSheetRows(
  rows: string[][],
  options?: { headerRow?: number },
): ExternalLeadRow[] {
  const headerRowIndex = Math.max((options?.headerRow ?? 1) - 1, 0);
  if (rows.length <= headerRowIndex) {
    return [];
  }

  const headers = rows[headerRowIndex] ?? [];
  const headerIndex = buildHeaderIndex(headers);
  const dataRows = rows.slice(headerRowIndex + 1);

  const col = {
    externalId: columnIndex(headerIndex, HEADER_ALIASES.externalId),
    capturedAt: columnIndex(headerIndex, HEADER_ALIASES.capturedAt),
    name: columnIndex(headerIndex, HEADER_ALIASES.name),
    phone: columnIndex(headerIndex, HEADER_ALIASES.phone),
    email: columnIndex(headerIndex, HEADER_ALIASES.email),
    city: columnIndex(headerIndex, HEADER_ALIASES.city),
    company: columnIndex(headerIndex, HEADER_ALIASES.company),
    role: columnIndex(headerIndex, HEADER_ALIASES.role),
    requirement: columnIndex(headerIndex, HEADER_ALIASES.requirement),
    sourceDetail: columnIndex(headerIndex, HEADER_ALIASES.sourceDetail),
    status: columnIndex(headerIndex, HEADER_ALIASES.status),
    nextFollowUp: columnIndex(headerIndex, HEADER_ALIASES.nextFollowUp),
    meetingNotes: columnIndex(headerIndex, HEADER_ALIASES.meetingNotes),
    callingStatus: columnIndex(headerIndex, HEADER_ALIASES.callingStatus),
    address: columnIndex(headerIndex, HEADER_ALIASES.address),
    zipCode: columnIndex(headerIndex, HEADER_ALIASES.zipCode),
  };

  const parsed: ExternalLeadRow[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    if (!row || row.every((cell) => !cell?.trim())) {
      continue;
    }

    const name = cellAt(row, col.name);
    const phone = cellAt(row, col.phone);
    const email = cellAt(row, col.email);
    const requirement = cellAt(row, col.requirement);

    if (!name && !phone && !email && !requirement) {
      continue;
    }

    const capturedAtRaw = cellAt(row, col.capturedAt);
    const externalId = stableExternalId({
      externalIdRaw: cellAt(row, col.externalId),
      capturedAtRaw,
      phone,
      email,
      rowNumber: headerRowIndex + index + 2,
    });

    const capturedAt = capturedAtRaw ? parseSheetDate(capturedAtRaw) : null;
    const statusRaw = cellAt(row, col.status);
    const status = statusRaw ? mapSheetStatus(statusRaw) : undefined;
    const remarks = cellAt(row, col.meetingNotes);
    const nextFollowUpRaw = cellAt(row, col.nextFollowUp);
    const callingRaw = cellAt(row, col.callingStatus);

    const company = cellAt(row, col.company);
    const role = cellAt(row, col.role);
    const sourceParts = [
      cellAt(row, col.sourceDetail),
      company ? `Company: ${company}` : "",
      role ? `Role: ${role}` : "",
    ].filter(Boolean);

    const raw: Record<string, string> = {};
    headers.forEach((header, position) => {
      const value = row[position]?.trim();
      if (header && value) {
        raw[header] = value;
      }
    });

    if (capturedAtRaw) {
      raw.capturedAtRaw = capturedAtRaw;
    }

    parsed.push({
      externalId,
      name: name || null,
      phone: phone || null,
      email: email || null,
      city: cellAt(row, col.city) || null,
      company: company || null,
      address: cellAt(row, col.address) || null,
      zipCode: cellAt(row, col.zipCode) || null,
      requirement: requirement || null,
      sourceDetail: sourceParts.join(" · ") || null,
      capturedAt,
      status,
      nextFollowUpAt: nextFollowUpRaw ? parseSheetDate(nextFollowUpRaw) : null,
      meetingNotes: remarks || null,
      callingStatus: callingRaw ? mapSheetCallingStatus(callingRaw) : undefined,
      raw,
    });
  }

  return parsed;
}

async function getSheetTitle(
  spreadsheetId: string,
  gid: string | null | undefined,
  preferredTab?: string,
) {
  if (preferredTab?.trim()) {
    return preferredTab.trim();
  }

  if (!isGoogleSheetsAuthConfigured()) {
    return DEFAULT_SHEET_TAB_FALLBACK;
  }

  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return DEFAULT_SHEET_TAB_FALLBACK;
  }

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });

  if (gid) {
    const numericGid = Number(gid);
    const match = meta.data.sheets?.find(
      (sheet) => sheet.properties?.sheetId === numericGid,
    );
    if (match?.properties?.title) {
      return match.properties.title;
    }
  }

  return meta.data.sheets?.[0]?.properties?.title ?? DEFAULT_SHEET_TAB_FALLBACK;
}

const DEFAULT_SHEET_TAB_FALLBACK = "Form Responses 1";

function buildCsvExportUrl(spreadsheetId: string, gid?: string | null) {
  const params = new URLSearchParams({ format: "csv" });
  if (gid) {
    params.set("gid", gid);
  }
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${params.toString()}`;
}

async function fetchRowsViaCsv(spreadsheetId: string, gid?: string | null) {
  const response = await fetch(buildCsvExportUrl(spreadsheetId, gid), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not read the Google Sheet (HTTP ${response.status}). Share the sheet with your Google service account or enable link access.`,
    );
  }

  const csv = await response.text();
  if (csv.includes("<!DOCTYPE html")) {
    throw new Error(
      "Google Sheet is not accessible. Share it with your service account email (Viewer access) in Google Sheets.",
    );
  }

  return parseCsv(csv);
}

async function fetchRowsViaApi(
  spreadsheetId: string,
  gid: string | null | undefined,
  preferredTab?: string,
) {
  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return null;
  }

  const sheetTitle = await getSheetTitle(spreadsheetId, gid, preferredTab);
  const quotedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quotedTitle,
  });
  return (response.data.values ?? []) as string[][];
}

export async function fetchLeadsSheetRows(configInput: GoogleSheetsLeadConfig) {
  const config = resolveGoogleSheetsLeadConfig(configInput) ?? defaultGoogleSheetsLeadConfig();

  const spreadsheetId =
    extractSpreadsheetId(config.spreadsheetId) ?? config.spreadsheetId;
  const gid =
    config.gid ??
    extractSheetGid(config.spreadsheetUrl ?? "") ??
    extractSheetGid(spreadsheetId);

  let apiError: Error | null = null;

  if (isGoogleSheetsAuthConfigured()) {
    try {
      const rows = await fetchRowsViaApi(spreadsheetId, gid, config.sheetTab);
      if (rows && rows.length > 0) {
        return {
          spreadsheetId,
          sheetTitle: config.sheetTab ?? null,
          rows,
          source: "api" as const,
        };
      }
      if (rows && rows.length === 0) {
        apiError = new Error("Google Sheets API returned no rows for this tab.");
      }
    } catch (error) {
      apiError =
        error instanceof Error
          ? error
          : new Error("Google Sheets API request failed.");
    }
  }

  try {
    const rows = await fetchRowsViaCsv(spreadsheetId, gid);
    if (rows.length > 0) {
      return {
        spreadsheetId,
        sheetTitle: config.sheetTab ?? null,
        rows,
        source: "csv" as const,
      };
    }
  } catch (csvError) {
    if (apiError) {
      throw apiError;
    }
    throw csvError;
  }

  if (apiError) {
    throw apiError;
  }

  throw new Error(
    "No lead rows found in the sheet. Check the tab/GID and confirm the form has responses.",
  );
}

export async function testLeadsGoogleSheetAccess(configInput: GoogleSheetsLeadConfig) {
  const { rows, source, spreadsheetId, sheetTitle } =
    await fetchLeadsSheetRows(configInput);
  const parsed = parseLeadsSheetRows(rows, {
    headerRow: resolveGoogleSheetsLeadConfig(configInput)?.headerRow ?? 1,
  });

  return {
    spreadsheetId,
    sheetTitle,
    source,
    rowCount: rows.length,
    leadCount: parsed.length,
  };
}

export async function pullLeadsFromGoogleSheet(configInput: GoogleSheetsLeadConfig) {
  const config = resolveGoogleSheetsLeadConfig(configInput);
  if (!config) {
    throw new Error("Spreadsheet ID is required.");
  }

  const { rows } = await fetchLeadsSheetRows(config);
  return parseLeadsSheetRows(rows, { headerRow: config.headerRow ?? 1 });
}
