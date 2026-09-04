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
