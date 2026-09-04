import type { MobileShopPhoneCondition } from "@prisma/client";

export type StockInPhoneLine = {
  kind: "PHONE";
  brand: string;
  model: string;
  color: string;
  imei: string;
  condition: MobileShopPhoneCondition;
};

export type StockInQtyLine = {
  kind: "ACCESSORY" | "PART";
  name: string;
  qty: number;
};

export type StockInLineInput = StockInPhoneLine | StockInQtyLine;

function asCondition(value: unknown): MobileShopPhoneCondition {
  if (value === "USED" || value === "REFURBISHED") return value;
  return "NEW";
}

function isBlankPhone(row: Record<string, unknown>) {
  const brand = String(row.brand ?? "").trim();
  const model = String(row.model ?? "").trim();
  const color = String(row.color ?? "").trim();
  const imei = String(row.imei ?? "").trim();
  return !brand && !model && !color && !imei;
}

function isBlankQty(row: Record<string, unknown>) {
  const name = String(row.name ?? "").trim();
  const qty = Number(row.qty);
  return !name && (!Number.isFinite(qty) || qty <= 0);
}

export function parseInboundLines(
  raw: unknown,
): { ok: true; lines: StockInLineInput[] } | { ok: false; message: string } {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, message: "Lines could not be read." };
    }
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, message: "Add at least one line on this invoice." };
  }

  const lines: StockInLineInput[] = [];
  const imeis = new Set<string>();

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const kindRaw = String(row.kind ?? row.what ?? "").toUpperCase();
    const isPhone =
      kindRaw === "PHONE" ||
      kindRaw === "PHONE_NEW" ||
      kindRaw === "PHONE_USED" ||
      kindRaw === "";

    if (kindRaw === "ACCESSORY" || kindRaw === "PART") {
      if (isBlankQty(row)) continue;
      const name = String(row.name ?? "").trim();
      const qty = Number.parseInt(String(row.qty ?? "0"), 10);
      if (!name) return { ok: false, message: "Name is required for accessories and parts." };
      if (!Number.isFinite(qty) || qty <= 0) {
        return { ok: false, message: "Qty must be more than 0." };
      }
      lines.push({ kind: kindRaw, name, qty });
      continue;
    }

    if (!isPhone) {
      return { ok: false, message: "Unknown line type." };
    }
    if (isBlankPhone(row)) continue;
    const brand = String(row.brand ?? "").trim();
    const model = String(row.model ?? "").trim();
    const color = String(row.color ?? "").trim();
    const imei = String(row.imei ?? "").trim();
    if (!imei) return { ok: false, message: "IMEI is required for phones." };
    if (!brand || !model) {
      return { ok: false, message: "Make and model are required for phones." };
    }
    if (imeis.has(imei)) {
      return { ok: false, message: `IMEI ${imei} is on this invoice twice.` };
    }
    imeis.add(imei);
    const condition =
      kindRaw === "PHONE_USED" ? "USED" : asCondition(row.condition);
    lines.push({ kind: "PHONE", brand, model, color, imei, condition });
  }

  if (lines.length === 0) {
    return { ok: false, message: "Add at least one line on this invoice." };
  }
  return { ok: true, lines };
}
