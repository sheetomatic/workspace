import * as XLSX from "xlsx";
import type { WhatsAppApiPlanKind } from "@prisma/client";
import type { WhatsAppApiClientInput } from "@/lib/billing/whatsapp-api-clients";
import {
  CUSTOM_WHATSAPP_API_PLAN_ID,
  resolveWhatsAppApiPlan,
  whatsAppApiPlanOptions,
} from "@/lib/billing/whatsapp-api-plans";
import { daysBetweenUtc } from "@/lib/billing/dates";
import { parseRupeesInput } from "@/lib/billing/money";
import { WHATSAPP_API_CLIENT_IMPORT_HEADERS } from "@/lib/billing/whatsapp-api-import-template";
import { normalizeWhatsAppPhone } from "@/lib/phone";

export { WHATSAPP_API_CLIENT_IMPORT_HEADERS, whatsAppApiClientCsvTemplate } from "@/lib/billing/whatsapp-api-import-template";

type ImportColumn =
  | (typeof WHATSAPP_API_CLIENT_IMPORT_HEADERS)[number]
  | "group"
  | "credits"
  | "externalId";

const HEADER_ALIASES: Record<string, ImportColumn> = {
  name: "name",
  client: "name",
  "client name": "name",
  customer: "name",
  "customer name": "name",
  username: "name",
  user: "name",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  "mobile number": "phone",
  whatsapp: "phone",
  "whatsapp number": "phone",
  contact: "phone",
  number: "phone",
  company: "company",
  firm: "company",
  organisation: "company",
  organization: "company",
  email: "email",
  "e mail": "email",
  "email address": "email",
  plan: "plan",
  "plan id": "plan",
  "plan name": "plan",
  pack: "plan",
  package: "plan",
  kind: "kind",
  api: "kind",
  "api type": "kind",
  amount: "amount",
  price: "amount",
  rupees: "amount",
  "plan amount": "amount",
  days: "days",
  duration: "days",
  validity: "days",
  "duration days": "days",
  started: "started",
  start: "started",
  "start date": "started",
  "started at": "started",
  "plan start": "started",
  "creation time": "started",
  created: "started",
  expires: "expires",
  expiry: "expires",
  expire: "expires",
  "expiry date": "expires",
  "expire date": "expires",
  "valid till": "expires",
  "active upto": "expires",
  "active until": "expires",
  "recharge by": "expires",
  due: "expires",
  "due date": "expires",
  notes: "notes",
  remark: "notes",
  remarks: "notes",
  group: "group",
  "account type": "group",
  "account group": "group",
  status: "group",
  credits: "credits",
  "credit points": "credits",
  "credit point": "credits",
  id: "externalId",
  "panel id": "externalId",
  externalid: "externalId",
  "external id": "externalId",
};

const CUSTOM_PLAN_KEYS = new Set(["custom", "custom plan", "other", "manual"]);

export type WhatsAppApiClientImportResult = {
  rows: WhatsAppApiClientInput[];
  errors: string[];
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizePlanKey(value: string) {
  return value
    .toLowerCase()
    .replace(/₹/g, " ")
    .replace(/[,]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHeaderIndex(headerRow: string[]) {
  const index: Partial<Record<ImportColumn, number>> = {};
  headerRow.forEach((cell, i) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && index[key] === undefined) {
      index[key] = i;
    }
  });
  return index;
}

function findHeaderRowIndex(rows: string[][]) {
  for (let i = 0; i < Math.min(6, rows.length); i += 1) {
    const index = buildHeaderIndex(rows[i] ?? []);
    if (index.name !== undefined && index.phone !== undefined) {
      return i;
    }
  }
  return -1;
}

function parseAccountGroup(raw: string): "REGULAR" | "INACTIVE" | undefined {
  const key = normalizePlanKey(raw);
  if (!key) return undefined;
  if (key === "regular" || key === "active") return "REGULAR";
  return "INACTIVE";
}

function panelDurationDays(startedAt: string | null, expiresAt: string | null) {
  if (startedAt && expiresAt) {
    const days = daysBetweenUtc(new Date(`${startedAt}T00:00:00.000Z`), new Date(`${expiresAt}T00:00:00.000Z`));
    if (Number.isFinite(days) && days >= 1) {
      return Math.min(1095, Math.round(days));
    }
  }
  return 365;
}

function cell(
  row: string[],
  index: Partial<Record<ImportColumn, number>>,
  key: ImportColumn,
) {
  const i = index[key];
  if (i === undefined) return "";
  return row[i]?.trim() ?? "";
}

export function parseWhatsAppApiImportDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const dmy = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function parseWhatsAppApiPlanKind(raw: string): WhatsAppApiPlanKind | undefined {
  const key = normalizePlanKey(raw);
  if (!key) return undefined;
  if (
    key.includes("unofficial") ||
    key.includes("web based") ||
    key === "web" ||
    key === "unoff"
  ) {
    return "UNOFFICIAL";
  }
  if (key.includes("official") || key === "off") {
    return "OFFICIAL";
  }
  return undefined;
}

export function matchWhatsAppApiImportPlan(input: {
  plan?: string;
  kind?: string;
  amount?: string;
  days?: string;
}):
  | { ok: true; planId: string; planKind?: WhatsAppApiPlanKind; customLabel?: string }
  | { ok: false; message: string } {
  const planRaw = input.plan?.trim() ?? "";
  const kind = parseWhatsAppApiPlanKind(input.kind ?? "");
  const amount = parseRupeesInput(input.amount ?? "");
  const days = Number(String(input.days ?? "").replace(/[^\d.]/g, ""));
  const hasCustomNumbers =
    amount !== null && amount > 0 && Number.isFinite(days) && days >= 1 && days <= 1095;

  if (!planRaw) {
    if (amount !== null && amount > 0) {
      const byAmount = whatsAppApiPlanOptions().filter(
        (plan) => (!kind || plan.kind === kind) && plan.amountPaise === amount,
      );
      if (byAmount.length === 1) {
        return { ok: true, planId: byAmount[0].id };
      }
    }
    if (hasCustomNumbers) {
      return {
        ok: true,
        planId: CUSTOM_WHATSAPP_API_PLAN_ID,
        planKind: kind ?? "UNOFFICIAL",
        customLabel: undefined,
      };
    }
    return { ok: false, message: "Add a plan id, plan name, or custom amount and days." };
  }

  if (planRaw && resolveWhatsAppApiPlan(planRaw)) {
    return { ok: true, planId: planRaw };
  }

  if (CUSTOM_PLAN_KEYS.has(normalizePlanKey(planRaw)) || (!planRaw && hasCustomNumbers)) {
    if (!hasCustomNumbers) {
      return { ok: false, message: "Custom plan needs amount and days." };
    }
    return {
      ok: true,
      planId: CUSTOM_WHATSAPP_API_PLAN_ID,
      planKind: kind ?? "UNOFFICIAL",
      customLabel: planRaw && !CUSTOM_PLAN_KEYS.has(normalizePlanKey(planRaw)) ? planRaw : undefined,
    };
  }

  const options = whatsAppApiPlanOptions().filter((plan) => !kind || plan.kind === kind);
  const key = normalizePlanKey(planRaw);

  const exact = options.find(
    (plan) => normalizePlanKey(plan.id) === key || normalizePlanKey(plan.label) === key,
  );
  if (exact) {
    return { ok: true, planId: exact.id };
  }

  const scored = options
    .map((plan) => {
      const labelKey = normalizePlanKey(plan.label);
      const idKey = normalizePlanKey(plan.id.replace(/^official-|^plan-/, ""));
      let score = 0;
      if (labelKey === key || idKey === key) score = 100;
      else if (key && (labelKey.includes(key) || key.includes(labelKey) || idKey.includes(key))) {
        score = 80;
      } else {
        const tokens = key.split(" ").filter((token) => token.length > 1);
        const hits = tokens.filter(
          (token) => labelKey.includes(token) || idKey.includes(token),
        ).length;
        score = hits >= 2 ? hits * 15 : hits * 8;
      }
      return { plan, score };
    })
    .filter((row) => row.score >= 20)
    .sort((left, right) => right.score - left.score);

  if (
    scored[0] &&
    (scored.length === 1 || scored[0].score >= 80) &&
    scored[0].score > (scored[1]?.score ?? 0)
  ) {
    return { ok: true, planId: scored[0].plan.id };
  }

  if (amount !== null && amount > 0) {
    const byAmount = options.filter((plan) => plan.amountPaise === amount);
    if (byAmount.length === 1) {
      return { ok: true, planId: byAmount[0].id };
    }
  }

  if (hasCustomNumbers) {
    return {
      ok: true,
      planId: CUSTOM_WHATSAPP_API_PLAN_ID,
      planKind: kind ?? "UNOFFICIAL",
      customLabel: planRaw || "Custom WhatsApp API plan",
    };
  }

  return {
    ok: false,
    message: `Unknown plan "${planRaw}". Use a template plan id, or amount + days.`,
  };
}

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    if (value > 20_000 && value < 80_000) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed?.y && parsed.m && parsed.d) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    }
    return String(value);
  }
  return String(value).trim();
}

export function spreadsheetToRows(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
    workbook.Sheets[sheetName],
    { header: 1, defval: "", blankrows: false, raw: false },
  );
  return rows
    .map((row) => (Array.isArray(row) ? row.map((value) => cellToString(value)) : []))
    .filter((row) => row.some((value) => value.length > 0));
}

export function parseWhatsAppApiClientRows(rows: string[][]): WhatsAppApiClientImportResult {
  if (rows.length < 2) {
    return { rows: [], errors: ["The file needs a header row and at least one client."] };
  }

  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex < 0) {
    return {
      rows: [],
      errors: ["Add name and phone columns. Download the template for the exact headers."],
    };
  }

  const index = buildHeaderIndex(rows[headerIndex] ?? []);
  const parsedRows: WhatsAppApiClientInput[] = [];
  const errors: string[] = [];
  const panelExport = index.group !== undefined || index.externalId !== undefined;

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const rowNumber = headerIndex + offset + 2;
    const name = cell(row, index, "name");
    const phone = cell(row, index, "phone");
    if (!name && !phone) return;

    const startedRaw = cell(row, index, "started");
    const expiresRaw = cell(row, index, "expires");
    const startedAt = startedRaw ? parseWhatsAppApiImportDate(startedRaw) : null;
    const expiresAt = expiresRaw ? parseWhatsAppApiImportDate(expiresRaw) : null;
    if (startedRaw && !startedAt) {
      errors.push(`Row ${rowNumber}: start date is not valid.`);
      return;
    }
    if (expiresRaw && !expiresAt) {
      errors.push(`Row ${rowNumber}: expiry date is not valid.`);
      return;
    }

    const matched = matchWhatsAppApiImportPlan({
      plan: cell(row, index, "plan"),
      kind: cell(row, index, "kind"),
      amount: cell(row, index, "amount"),
      days: cell(row, index, "days"),
    });
    const panelPlan =
      !matched.ok && panelExport
        ? {
            ok: true as const,
            planId: CUSTOM_WHATSAPP_API_PLAN_ID,
            planKind: "UNOFFICIAL" as const,
            customLabel: "WhatsApp API panel",
          }
        : null;
    const plan = matched.ok ? matched : panelPlan;
    if (!plan || !plan.ok) {
      errors.push(`Row ${rowNumber}: ${matched.ok ? "Choose a plan." : matched.message}`);
      return;
    }

    if (name.trim().length < 2) {
      errors.push(`Row ${rowNumber}: enter the client name.`);
      return;
    }
    if (!normalizeWhatsAppPhone(phone)) {
      errors.push(`Row ${rowNumber}: enter a valid WhatsApp number.`);
      return;
    }

    const emailRaw = cell(row, index, "email");
    const email =
      emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? "" : emailRaw;
    const credits = cell(row, index, "credits");
    const externalId = cell(row, index, "externalId");
    const noteParts = [
      cell(row, index, "notes"),
      externalId ? `Panel #${externalId}` : "",
      credits ? `${credits} credits` : "",
    ].filter(Boolean);

    parsedRows.push({
      externalId,
      name,
      phone,
      company: cell(row, index, "company"),
      email,
      planId: plan.planId,
      planKind: plan.planKind ?? parseWhatsAppApiPlanKind(cell(row, index, "kind")),
      customLabel: plan.customLabel ?? cell(row, index, "plan") ?? "WhatsApp API panel",
      customAmountRupees: cell(row, index, "amount") || (panelExport ? "0" : ""),
      customDurationDays:
        cell(row, index, "days") ||
        (panelExport ? String(panelDurationDays(startedAt, expiresAt)) : ""),
      startedAt,
      expiresAt,
      notes: noteParts.join(" · ") || null,
      accountGroup: parseAccountGroup(cell(row, index, "group")),
      allowZeroAmount: panelExport,
    });
  });

  return { rows: parsedRows, errors };
}

export function parseWhatsAppApiClientSpreadsheet(buffer: Buffer): WhatsAppApiClientImportResult {
  try {
    return parseWhatsAppApiClientRows(spreadsheetToRows(buffer));
  } catch {
    return {
      rows: [],
      errors: ["Could not read that file. Upload a .csv, .xlsx, or .xls using the template."],
    };
  }
}
