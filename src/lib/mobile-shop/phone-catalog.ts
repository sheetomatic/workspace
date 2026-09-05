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

export type PhonePick = {
  brand: string;
  model: string;
  color: string;
};

/** Models for a family. Empty family → every model (Add/New still works). */
export function catalogModelsFor(catalog: PhoneCatalogEntry[], brand: string): string[] {
  const wanted = fold(brand);
  const source = wanted
    ? catalog.filter((entry) => fold(entry.brand) === wanted)
    : catalog;
  return uniqueCatalogValues(source, "model");
}

/** Colors for family + model. Missing steps → remaining colors. */
export function catalogColorsFor(
  catalog: PhoneCatalogEntry[],
  brand: string,
  model: string,
): string[] {
  const wantedBrand = fold(brand);
  const wantedModel = fold(model);
  const source = catalog.filter((entry) => {
    if (wantedBrand && fold(entry.brand) !== wantedBrand) return false;
    if (wantedModel && fold(entry.model) !== wantedModel) return false;
    return Boolean(entry.color?.trim());
  });
  return uniqueCatalogValues(source, "color");
}

/**
 * Apple-style pick: family → model → color.
 * Later fields clear when they no longer match. Model/color can infer the rest
 * when only one catalog hit exists.
 */
export function cascadeAfterPick(
  catalog: PhoneCatalogEntry[],
  current: PhonePick,
  field: keyof PhonePick,
  value: string,
): PhonePick {
  const next: PhonePick = { ...current, [field]: value };

  if (field === "brand") {
    const models = catalogModelsFor(catalog, next.brand);
    if (!models.some((item) => fold(item) === fold(next.model))) next.model = "";
    const colors = catalogColorsFor(catalog, next.brand, next.model);
    if (!colors.some((item) => fold(item) === fold(next.color))) next.color = "";
    return next;
  }

  if (field === "model") {
    if (!fold(next.brand)) {
      const owners = catalog.filter((entry) => fold(entry.model) === fold(next.model));
      const brands = uniqueCatalogValues(owners, "brand");
      if (brands.length === 1) next.brand = brands[0];
    }
    const colors = catalogColorsFor(catalog, next.brand, next.model);
    if (!colors.some((item) => fold(item) === fold(next.color))) next.color = "";
    return next;
  }

  if (!fold(next.brand) || !fold(next.model)) {
    const hits = catalog.filter((entry) => {
      if (fold(entry.color) !== fold(next.color)) return false;
      if (fold(next.brand) && fold(entry.brand) !== fold(next.brand)) return false;
      if (fold(next.model) && fold(entry.model) !== fold(next.model)) return false;
      return true;
    });
    if (hits.length === 1) {
      next.brand = hits[0].brand;
      next.model = hits[0].model;
    }
  }
  return next;
}

export function unsoldAsCatalog(phones: UnsoldPhone[]): PhoneCatalogEntry[] {
  return uniquePhoneCatalog(phones);
}

export function unsoldMatching(
  phones: UnsoldPhone[],
  pick: PhonePick,
): UnsoldPhone[] {
  const brand = fold(pick.brand);
  const model = fold(pick.model);
  const color = fold(pick.color);
  return phones.filter((phone) => {
    if (phone.qty <= 0 || !phone.imei) return false;
    if (brand && fold(phone.brand ?? "") !== brand) return false;
    if (model && fold(phone.model ?? "") !== model) return false;
    if (color && fold(phone.color ?? "") !== color) return false;
    return true;
  });
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

