export function moveColumnHeaders(
  headers: string[],
  column: string,
  direction: -1 | 1,
): string[] {
  const index = headers.indexOf(column);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= headers.length) {
    return headers;
  }
  const next = [...headers];
  const swap = next[index];
  next[index] = next[nextIndex]!;
  next[nextIndex] = swap!;
  return next;
}
