import type { InboundLeadStatus } from "@prisma/client";
import {
  createGoogleSheetsClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { parseSheetDate } from "@/lib/integrations/google-sheets-parse";
import { extractSheetGid, extractSpreadsheetId } from "@/lib/integrations/resolve-sheet-id";
import { parseCsv } from "@/lib/legal-cases/import-csv";
import type { ExternalLeadRow } from "@/lib/leads/sync-sources";
import {
  defaultGoogleSheetsLeadConfig,
  resolveGoogleSheetsLeadConfig,
  type GoogleSheetsLeadConfig,
} from "@/lib/leads/sheet-config";

const HEADER_ALIASES = {
  externalId: ["id", "lead id", "lead_id", "s.no", "s no", "sr no", "sr. no", "row"],
  capturedAt: [
    "date",
    "lead date",
    "created",
    "created at",
    "timestamp",
    "time",
    "submitted",
  ],
  name: ["name", "lead name", "customer", "client", "contact name", "full name"],
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
    "message",
    "notes",
    "query",
    "product",
    "description",
    "remarks",
    "need",
  ],
  sourceDetail: ["source", "campaign", "channel", "form", "ad", "medium"],
  status: ["status", "stage", "pipeline"],
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
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, InboundLeadStatus> = {
    NEW: "NEW",
    CONTACTED: "CONTACTED",
    FOLLOW_UP: "FOLLOW_UP",
    FOLLOWUP: "FOLLOW_UP",
    QUALIFIED: "QUALIFIED",
    WON: "WON",
    CLOSED_WON: "WON",
    LOST: "LOST",
    CLOSED_LOST: "LOST",
  };
  return map[normalized];
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

    const externalIdRaw = cellAt(row, col.externalId);
    const externalId =
      externalIdRaw || `sheet-row-${headerRowIndex + index + 2}`;

    const capturedAtRaw = cellAt(row, col.capturedAt);
    const capturedAt = capturedAtRaw ? parseSheetDate(capturedAtRaw) : null;
    const statusRaw = cellAt(row, col.status);
    const status = statusRaw ? mapSheetStatus(statusRaw) : undefined;

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

    parsed.push({
      externalId,
      name: name || null,
      phone: phone || null,
      email: email || null,
      city: cellAt(row, col.city) || null,
      requirement: requirement || null,
      sourceDetail: sourceParts.join(" · ") || null,
      capturedAt,
      status,
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
    return "Sheet1";
  }

  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return "Sheet1";
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

  return meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";
}

function buildCsvExportUrl(spreadsheetId: string, gid?: string | null) {
  const params = new URLSearchParams({ format: "csv" });
  if (gid) {
    params.set("gid", gid);
  }
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${params.toString()}`;
}

export async function fetchLeadsSheetRows(configInput: GoogleSheetsLeadConfig) {
  const config = resolveGoogleSheetsLeadConfig(configInput) ?? {
    ...defaultGoogleSheetsLeadConfig(),
    spreadsheetId: defaultGoogleSheetsLeadConfig().spreadsheetId!,
  };

  const spreadsheetId =
    extractSpreadsheetId(config.spreadsheetId) ?? config.spreadsheetId;
  const gid =
    config.gid ??
    extractSheetGid(config.spreadsheetUrl ?? "") ??
    extractSheetGid(spreadsheetId);

  if (isGoogleSheetsAuthConfigured()) {
    const sheets = createGoogleSheetsClient();
    if (sheets) {
      const sheetTitle = await getSheetTitle(spreadsheetId, gid, config.sheetTab);
      const quotedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: quotedTitle,
      });
      const rows = (response.data.values ?? []) as string[][];
      if (rows.length > 0) {
        return { spreadsheetId, sheetTitle, rows };
      }
    }
  }

  const response = await fetch(buildCsvExportUrl(spreadsheetId, gid), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not read the Google Sheet (HTTP ${response.status}). Share the sheet with your Google service account or publish CSV export access.`,
    );
  }

  const csv = await response.text();
  if (csv.includes("<!DOCTYPE html")) {
    throw new Error(
      "Google Sheet is not accessible. Share it with your service account email or enable link access.",
    );
  }

  return {
    spreadsheetId,
    sheetTitle: config.sheetTab ?? null,
    rows: parseCsv(csv),
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
