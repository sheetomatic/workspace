export type PhoneCatalogCondition = "NEW" | "USED" | "REFURBISHED";

export type PhoneCatalogEntry = {
  brand: string;
  model: string;
  color: string;
  condition: PhoneCatalogCondition | null;
};

export type PhoneCatalogSource = {
  kind?: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  condition?: string | null;
};

function fold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function phoneCatalogKey(entry: {
  brand: string;
  model: string;
  color: string;
}) {
  return `${fold(entry.brand)}|${fold(entry.model)}|${fold(entry.color)}`;
}

function asCondition(value: string | null | undefined): PhoneCatalogCondition | null {
  if (value === "NEW" || value === "USED" || value === "REFURBISHED") return value;
  return null;
}

/** Distinct make + model + color from phones already in the shop (sold ones still teach the catalog). */
export function uniquePhoneCatalog(items: PhoneCatalogSource[]): PhoneCatalogEntry[] {
  const seen = new Map<string, PhoneCatalogEntry>();
  for (const item of items) {
    if (item.kind && item.kind !== "PHONE") continue;
    const brand = item.brand?.trim() ?? "";
    const model = item.model?.trim() ?? "";
    if (!brand && !model) continue;
    const color = item.color?.trim() ?? "";
    const key = phoneCatalogKey({ brand, model, color });
    if (seen.has(key)) continue;
    seen.set(key, {
      brand,
      model,
      color,
      condition: asCondition(item.condition),
    });
  }
  return [...seen.values()].sort((a, b) =>
    `${a.brand} ${a.model} ${a.color}`.localeCompare(`${b.brand} ${b.model} ${b.color}`),
  );
}

/** Typeahead: every token must appear in make, model, or color. */
export function searchPhoneCatalog(
  catalog: PhoneCatalogEntry[],
  query: string,
  limit = 8,
): PhoneCatalogEntry[] {
  const tokens = fold(query).split(" ").filter(Boolean);
  const matched =
    tokens.length === 0
      ? catalog
      : catalog.filter((entry) => {
          const hay = `${fold(entry.brand)} ${fold(entry.model)} ${fold(entry.color)}`;
          return tokens.every((token) => hay.includes(token));
        });
  return matched.slice(0, limit);
}

export function uniqueCatalogValues(
  catalog: PhoneCatalogEntry[],
  field: "brand" | "model" | "color",
): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of catalog) {
    const value = entry[field]?.trim() ?? "";
    if (!value) continue;
    const key = fold(value);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }
  return values.sort((a, b) => a.localeCompare(b));
}

export type UnsoldPhone = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  imei: string | null;
  condition: string | null;
  qty: number;
};

/** Typeahead over unsold phones (make/model/color/IMEI). */
export function searchUnsoldPhones(
  phones: UnsoldPhone[],
  query: string,
  limit = 12,
): UnsoldPhone[] {
  const tokens = fold(query).split(" ").filter(Boolean);
  const inStock = phones.filter((phone) => phone.qty > 0 && phone.imei);
  const matched =
    tokens.length === 0
      ? inStock
      : inStock.filter((phone) => {
          const hay = `${fold(phone.brand ?? "")} ${fold(phone.model ?? "")} ${fold(phone.color ?? "")} ${fold(phone.name)} ${fold(phone.imei ?? "")}`;
          return tokens.every((token) => hay.includes(token));
        });
  return matched.slice(0, limit);
}

/** First unsold IMEI matching make/model/color, or the given IMEI if still in stock. */
export function pickImeiFromStock(
  phones: UnsoldPhone[],
  pick: { brand?: string; model?: string; color?: string; imei?: string },
): string | null {
  const wantedImei = pick.imei?.trim() ?? "";
  if (wantedImei) {
    const exact = phones.find((phone) => phone.qty > 0 && phone.imei === wantedImei);
    return exact?.imei ?? null;
  }
  const brand = fold(pick.brand ?? "");
  const model = fold(pick.model ?? "");
  const color = fold(pick.color ?? "");
  if (!brand && !model && !color) return null;
  const hit = phones.find((phone) => {
    if (phone.qty <= 0 || !phone.imei) return false;
    if (brand && fold(phone.brand ?? "") !== brand) return false;
    if (model && fold(phone.model ?? "") !== model) return false;
    if (color && fold(phone.color ?? "") !== color) return false;
    return true;
  });
  return hit?.imei ?? null;
}

