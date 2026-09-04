export function parsePromisedAt(raw: string | Date | null | undefined) {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? ("invalid" as const) : raw;
  }
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? ("invalid" as const) : dt;
}

export function formatPromisedAt(date: Date) {
  return date.toISOString().slice(0, 10);
}
