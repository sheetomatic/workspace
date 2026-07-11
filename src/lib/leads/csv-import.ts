import type { InboundLeadStatus, LeadSourceChannel } from "@prisma/client";
import { parseCsv } from "@/lib/legal-cases/import-csv";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";
import { parseLeadSourceChannel } from "@/lib/leads/channels";
import { mapSheetStageToStatus } from "@/lib/leads/stage-ai";
import { rowsToCsv } from "@/lib/csv-utils";

export const LEADS_CSV_TEMPLATE_HEADERS = [
  "name",
  "phone",
  "email",
  "company",
  "city",
  "requirement",
  "status",
  "source",
  "campaign",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "landing_page",
  "pipe_value",
  "expected_close",
  "win_probability",
] as const;

export type ParsedLeadCsvRow = {
  rowNumber: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  requirement: string | null;
  status: InboundLeadStatus | null;
  channel: LeadSourceChannel;
  campaign: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  pipeValue: number | null;
  expectedCloseAt: Date | null;
  winProbability: number | null;
  externalId: string;
};

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  "full name": "name",
  "lead name": "name",
  contact: "name",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  "mobile number": "phone",
  whatsapp: "phone",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  company: "company",
  organisation: "company",
  organization: "company",
  city: "city",
  town: "city",
  requirement: "requirement",
  message: "requirement",
  notes: "requirement",
  interest: "requirement",
  status: "status",
  stage: "status",
  source: "source",
  channel: "source",
  campaign: "campaign",
  "utm source": "utm_source",
  utm_source: "utm_source",
  "utm medium": "utm_medium",
  utm_medium: "utm_medium",
  "utm campaign": "utm_campaign",
  utm_campaign: "utm_campaign",
  "landing page": "landing_page",
  landing_page: "landing_page",
  landingpage: "landing_page",
  "pipe value": "pipe_value",
  pipe_value: "pipe_value",
  value: "pipe_value",
  amount: "pipe_value",
  "expected close": "expected_close",
  expected_close: "expected_close",
  "close date": "expected_close",
  "win probability": "win_probability",
  win_probability: "win_probability",
  probability: "win_probability",
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function buildHeaderIndex(headerRow: string[]) {
  const index: Record<string, number> = {};
  headerRow.forEach((cell, i) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && index[key] === undefined) {
      index[key] = i;
    }
  });
  return index;
}

function cell(row: string[], index: Record<string, number>, key: string) {
  const i = index[key];
  if (i === undefined) return "";
  return row[i]?.trim() ?? "";
}

function parseMoney(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number.parseFloat(raw.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseProbability(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number.parseFloat(raw.replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n);
}

function parseCloseDate(raw: string): Date | null {
  if (!raw.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseStatus(raw: string): InboundLeadStatus | null {
  if (!raw.trim()) return null;
  const fromStage = mapSheetStageToStatus(raw);
  if (fromStage) return fromStage;
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
  const allowed: InboundLeadStatus[] = [
    "NEW",
    "SCHEDULE_MEETING",
    "MEETING_NOTES",
    "CONTACTED",
    "FOLLOW_UP",
    "QUALIFIED",
    "DEMO_SCHEDULED",
    "PROPOSAL",
    "NEGOTIATION",
    "INVOICE",
    "PAYMENT",
    "PROJECT_ACTIVE",
    "WON",
    "LOST",
  ];
  return allowed.includes(normalized as InboundLeadStatus)
    ? (normalized as InboundLeadStatus)
    : null;
}

export function leadsCsvTemplateContent() {
  return rowsToCsv([
    [...LEADS_CSV_TEMPLATE_HEADERS],
    [
      "Priya Sharma",
      "9876543210",
      "priya@example.com",
      "Acme Traders",
      "Indore",
      "Need FMS for dispatch",
      "NEW",
      "MANUAL",
      "Website July",
      "google",
      "cpc",
      "fms_demo",
      "https://sheetomatic.com/fms",
      "50000",
      "2026-08-15",
      "40",
    ],
  ]);
}

export function parseLeadsCsv(content: string): {
  rows: ParsedLeadCsvRow[];
  errors: string[];
} {
  const table = parseCsv(content);
  const errors: string[] = [];
  if (table.length < 2) {
    return { rows: [], errors: ["CSV needs a header row and at least one data row."] };
  }

  const index = buildHeaderIndex(table[0] ?? []);
  if (index.phone === undefined && index.email === undefined) {
    return {
      rows: [],
      errors: ["CSV must include a phone or email column."],
    };
  }

  const rows: ParsedLeadCsvRow[] = [];
  for (let i = 1; i < table.length; i += 1) {
    const row = table[i] ?? [];
    if (row.every((cellValue) => !cellValue?.trim())) {
      continue;
    }

    const phoneRaw = cell(row, index, "phone");
    const emailRaw = cell(row, index, "email");
    const phone = leadPhoneDigits(phoneRaw) ?? (phoneRaw.trim() || null);
    const email = emailRaw.trim().toLowerCase() || null;

    if (!phone && !email) {
      errors.push(`Row ${i + 1}: missing phone and email — skipped.`);
      continue;
    }

    const sourceRaw = cell(row, index, "source");
    const channel =
      parseLeadSourceChannel(sourceRaw) ??
      ("MANUAL" as LeadSourceChannel);

    const externalId = `csv-${i + 1}-${phone ?? email}`;

    rows.push({
      rowNumber: i + 1,
      name: cell(row, index, "name") || null,
      phone,
      email,
      company: cell(row, index, "company") || null,
      city: cell(row, index, "city") || null,
      requirement: cell(row, index, "requirement") || null,
      status: parseStatus(cell(row, index, "status")),
      channel,
      campaign: cell(row, index, "campaign") || null,
      utmSource: cell(row, index, "utm_source") || null,
      utmMedium: cell(row, index, "utm_medium") || null,
      utmCampaign: cell(row, index, "utm_campaign") || null,
      landingPage: cell(row, index, "landing_page") || null,
      pipeValue: parseMoney(cell(row, index, "pipe_value")),
      expectedCloseAt: parseCloseDate(cell(row, index, "expected_close")),
      winProbability: parseProbability(cell(row, index, "win_probability")),
      externalId,
    });
  }

  return { rows, errors };
}
