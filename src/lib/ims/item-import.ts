import type { ImsAbcClass, ImsItemType, ImsQcPolicy } from "@prisma/client";
import type { ImsItemImportRow } from "@/lib/ims/ims-store";

export const ITEM_IMPORT_COLUMNS = [
  "code",
  "name",
  "type",
  "uom",
  "category",
  "abcClass",
  "unitCost",
  "minQty",
  "reorderQty",
  "maxQty",
  "qcOnReceipt",
  "isActive",
] as const;

export const ITEM_IMPORT_TEMPLATE_HEADERS = [
  "code",
  "name",
  "type",
  "uom",
  "category",
  "abcClass",
  "unitCost",
  "minQty",
  "reorderQty",
  "maxQty",
  "qcOnReceipt",
  "isActive",
];

export const ITEM_IMPORT_TEMPLATE_SAMPLE = [
  "RM-001",
  "Steel sheet 2mm",
  "Raw material",
  "kg",
  "Metals",
  "A",
  "120",
  "100",
  "250",
  "1000",
  "Optional",
  "Yes",
];

export type ParsedImportRow = {
  rowNumber: number;
  data: ImsItemImportRow;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
};

function pick(raw: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(raw).find(
      (header) => header.trim().toLowerCase() === key.toLowerCase(),
    );
    if (found && raw[found] !== undefined && raw[found] !== null) {
      return String(raw[found]).trim();
    }
  }
  return "";
}

function parseNum(value: string): number {
  if (!value) {
    return 0;
  }
  const cleaned = value.replace(/[, ]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

function parseType(value: string): ImsItemType | null {
  const v = value.toLowerCase();
  if (!v) {
    return "RAW_MATERIAL";
  }
  if (["raw material", "raw", "rm", "raw_material"].includes(v)) {
    return "RAW_MATERIAL";
  }
  if (["finished good", "finished", "fg", "finished_good"].includes(v)) {
    return "FINISHED_GOOD";
  }
  return null;
}

function parseAbc(value: string): ImsAbcClass | null {
  const v = value.toUpperCase();
  if (!v) {
    return "C";
  }
  if (v === "A" || v === "B" || v === "C") {
    return v as ImsAbcClass;
  }
  return null;
}

function parseQc(value: string): ImsQcPolicy | null {
  const v = value.toLowerCase();
  if (!v) {
    return "OPTIONAL";
  }
  if (v.startsWith("off")) {
    return "OFF";
  }
  if (v.startsWith("opt")) {
    return "OPTIONAL";
  }
  if (v.startsWith("alw")) {
    return "ALWAYS";
  }
  return null;
}

function parseBool(value: string): boolean {
  const v = value.toLowerCase();
  if (!v) {
    return true;
  }
  return ["true", "yes", "y", "1", "active"].includes(v);
}

export function normalizeItemImportRow(
  raw: Record<string, string>,
  rowNumber: number,
): ParsedImportRow {
  const errors: string[] = [];

  const code = pick(raw, ["code", "item code", "sku"]);
  const name = pick(raw, ["name", "item name", "description name"]);
  const typeRaw = pick(raw, ["type", "itemtype", "item type"]);
  const uom = pick(raw, ["uom", "unit", "unit of measure"]);
  const category = pick(raw, ["category", "group"]);
  const abcRaw = pick(raw, ["abcclass", "abc class", "abc"]);
  const unitCostRaw = pick(raw, ["unitcost", "unit cost", "cost", "rate"]);
  const minRaw = pick(raw, ["minqty", "min qty", "min", "minimum"]);
  const reorderRaw = pick(raw, ["reorderqty", "reorder qty", "reorder"]);
  const maxRaw = pick(raw, ["maxqty", "max qty", "max", "maximum"]);
  const qcRaw = pick(raw, ["qconreceipt", "qc on receipt", "qc", "qc policy"]);
  const activeRaw = pick(raw, ["isactive", "active", "status"]);

  if (!code) {
    errors.push("Missing code");
  }
  if (!name) {
    errors.push("Missing name");
  }

  const itemType = parseType(typeRaw);
  if (itemType === null) {
    errors.push(`Invalid type "${typeRaw}" (use Raw material or Finished good)`);
  }

  const abcClass = parseAbc(abcRaw);
  if (abcClass === null) {
    errors.push(`Invalid ABC class "${abcRaw}" (use A, B, or C)`);
  }

  const qcOnReceipt = parseQc(qcRaw);
  if (qcOnReceipt === null) {
    errors.push(`Invalid QC policy "${qcRaw}" (use Off, Optional, or Always)`);
  }

  const unitCost = parseNum(unitCostRaw);
  const minQty = parseNum(minRaw);
  const reorderQty = parseNum(reorderRaw);
  const maxQty = parseNum(maxRaw);

  for (const [label, value] of [
    ["unit cost", unitCost],
    ["min qty", minQty],
    ["reorder qty", reorderQty],
    ["max qty", maxQty],
  ] as const) {
    if (Number.isNaN(value)) {
      errors.push(`Invalid ${label}`);
    } else if (value < 0) {
      errors.push(`${label} cannot be negative`);
    }
  }

  const data: ImsItemImportRow = {
    code,
    name,
    uom,
    category,
    itemType: itemType ?? "RAW_MATERIAL",
    abcClass: abcClass ?? "C",
    unitCost: Number.isNaN(unitCost) ? 0 : unitCost,
    minQty: Number.isNaN(minQty) ? 0 : minQty,
    reorderQty: Number.isNaN(reorderQty) ? 0 : reorderQty,
    maxQty: Number.isNaN(maxQty) ? 0 : maxQty,
    qcOnReceipt: qcOnReceipt ?? "OPTIONAL",
    isActive: parseBool(activeRaw),
  };

  return {
    rowNumber,
    data,
    raw,
    valid: errors.length === 0,
    errors,
  };
}
