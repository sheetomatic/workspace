import {
  createGoogleSheetsClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import {
  extractSheetGid,
  extractSpreadsheetId,
} from "@/lib/integrations/resolve-sheet-id";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { parseSheetDate } from "@/lib/integrations/google-sheets-parse";

export const DEFAULT_FORM_RESPONSES_SHEET_URL =
  process.env.LEAD_CAPTURE_FORM_RESPONSES_SHEET_URL?.trim() ||
  "https://docs.google.com/spreadsheets/d/1uXA3TsZrT9uZNR3fiooNzBKFRYGrxt_1ydJdyJEt11Y/edit?gid=1019902152";

export const FORM_RESPONSES_SHEET_TAB =
  process.env.LEAD_CAPTURE_FORM_RESPONSES_TAB?.trim() || "Responses";

export type ParsedFormResponse = {
  timestamp?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  requirement?: string;
  allValues: string[];
};

type SheetCacheEntry = {
  fetchedAt: number;
  rows: ParsedFormResponse[];
};

const CACHE_TTL_MS = 45_000;
const sheetCache = new Map<string, SheetCacheEntry>();

const PHONE_HEADERS = [
  "phone",
  "mobile",
  "whatsapp",
  "whatsapp number",
  "contact number",
  "phone number",
  "your phone",
  "your whatsapp",
];

const NAME_HEADERS = [
  "name",
  "full name",
  "your name",
  "first name",
  "last name",
  "customer name",
  "client name",
];
const EMAIL_HEADERS = ["email", "email address", "e-mail", "mail id"];
const CITY_HEADERS = ["city", "location", "your city"];
const REQUIREMENT_HEADERS = [
  "requirement",
  "message",
  "query",
  "what do you need",
  "details",
  "description",
  "your requirement",
  "help with",
];

const NON_PERSON_NAME_HEADER =
  /\b(company|business|organisation|organization|user|file|brand|product|shop|store)\b/;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[*?:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function phonesMatch(left: string, right: string) {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const minLen = 10;
  if (a.length >= minLen && b.length >= minLen) {
    return a.slice(-minLen) === b.slice(-minLen);
  }
  return a.endsWith(b) || b.endsWith(a);
}

function pickField(
  row: Record<string, string>,
  headers: string[],
): string | undefined {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header);
    if (headers.some((candidate) => normalized.includes(candidate))) {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
}

/** Exact / word-boundary person-name headers only — never loose `includes("name")`. */
function matchesPersonNameHeader(normalized: string): boolean {
  if (NAME_HEADERS.includes(normalized)) {
    return true;
  }
  if (NON_PERSON_NAME_HEADER.test(normalized)) {
    return false;
  }
  return /(?:^|\s)((?:full|your|first|last|customer|client)\s+)?name$/.test(
    normalized,
  );
}

function pickPersonNameField(
  row: Record<string, string>,
): string | undefined {
  for (const [header, value] of Object.entries(row)) {
    if (!matchesPersonNameHeader(normalizeHeader(header))) {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

function parseResponseRow(
  headers: string[],
  values: string[],
): ParsedFormResponse | null {
  const row: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]?.trim();
    if (!header) {
      continue;
    }
    row[header] = (values[index] ?? "").trim();
  }

  const name = pickPersonNameField(row);
  if (!name) {
    return null;
  }

  return {
    timestamp: row[headers[0] ?? ""]?.trim() || pickField(row, ["timestamp"]),
    name,
    email: pickField(row, EMAIL_HEADERS),
    phone: pickField(row, PHONE_HEADERS),
    city: pickField(row, CITY_HEADERS),
    requirement: pickField(row, REQUIREMENT_HEADERS),
    allValues: values.map((value) => value.trim()).filter(Boolean),
  };
}

export function resolveFormResponsesSheetConfig() {
  const spreadsheetId = extractSpreadsheetId(DEFAULT_FORM_RESPONSES_SHEET_URL);
  if (!spreadsheetId) {
    return null;
  }

  return {
    spreadsheetId,
    gid: extractSheetGid(DEFAULT_FORM_RESPONSES_SHEET_URL),
    tabName: FORM_RESPONSES_SHEET_TAB,
  };
}

async function loadFormResponses(
  spreadsheetId: string,
): Promise<ParsedFormResponse[]> {
  const cached = sheetCache.get(spreadsheetId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return [];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${FORM_RESPONSES_SHEET_TAB}!A1:Z`,
  });

  const values = response.data.values ?? [];
  if (values.length < 2) {
    sheetCache.set(spreadsheetId, { fetchedAt: Date.now(), rows: [] });
    return [];
  }

  const headers = (values[0] ?? []).map((cell) => String(cell ?? ""));
  const rows: ParsedFormResponse[] = [];

  for (const line of values.slice(1)) {
    const parsed = parseResponseRow(
      headers,
      (line ?? []).map((cell) => String(cell ?? "")),
    );
    if (parsed) {
      rows.push(parsed);
    }
  }

  sheetCache.set(spreadsheetId, { fetchedAt: Date.now(), rows });
  return rows;
}

export async function findFormResponseForPhone(
  phoneInput: string,
  options: { since?: Date } = {},
): Promise<ParsedFormResponse | null> {
  if (!isGoogleSheetsAuthConfigured()) {
    return null;
  }

  const phone = normalizeWhatsAppPhone(phoneInput);
  if (!phone) {
    return null;
  }

  const config = resolveFormResponsesSheetConfig();
  if (!config) {
    return null;
  }

  try {
    const rows = await loadFormResponses(config.spreadsheetId);
    const matches = rows.filter((row) => {
      if (row.phone && phonesMatch(row.phone, phone)) {
        return true;
      }
      return row.allValues.some((value) => phonesMatch(value, phone));
    });

    if (matches.length === 0) {
      return null;
    }

    // Only return phone-matched rows. Never fall back to a recent unmatched row
    // (that assigns another person's name to this contact).
    if (!options.since) {
      return matches.at(-1) ?? null;
    }

    const sinceMs = options.since.getTime();
    const recentMatch = [...matches].reverse().find((row) => {
      const timestamp = parseSheetDate(row.timestamp);
      return timestamp ? timestamp.getTime() >= sinceMs : true;
    });
    return recentMatch ?? matches.at(-1) ?? null;
  } catch {
    return null;
  }
}
