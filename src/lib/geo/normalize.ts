export function normalizePlaceName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function placeNameKey(value: string) {
  return normalizePlaceName(value).toLowerCase();
}

export function isValidPlaceName(value: string) {
  const name = normalizePlaceName(value);
  return name.length >= 2 && name.length <= 80 && /[\p{L}]/u.test(name);
}
