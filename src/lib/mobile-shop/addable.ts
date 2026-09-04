function fold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function comboSuggestions(
  options: string[],
  query: string,
  limit = 8,
): { hits: string[]; addNew: string | null } {
  const q = query.trim();
  const needle = fold(q);
  const hits = (
    needle
      ? options.filter((option) => fold(option).includes(needle))
      : options
  ).slice(0, limit);
  const exact = options.some((option) => fold(option) === needle);
  return {
    hits,
    addNew: q && !exact ? q : null,
  };
}

export function searchNamedItems<T extends { name: string }>(
  items: T[],
  query: string,
  limit = 24,
): T[] {
  const tokens = fold(query).split(" ").filter(Boolean);
  const matched =
    tokens.length === 0
      ? items
      : items.filter((item) => {
          const hay = fold(item.name);
          return tokens.every((token) => hay.includes(token));
        });
  return matched.slice(0, limit);
}
