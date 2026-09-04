/** Fallback reorder level for accessories/parts when MOQ is unset. */
export const QTY_MOQ_FALLBACK = 2;

export function effectiveMoq(moq: number, kind: string): number {
  if (Number.isFinite(moq) && moq > 0) return Math.floor(moq);
  if (kind === "ACCESSORY" || kind === "PART") return QTY_MOQ_FALLBACK;
  return 0;
}

export function isBelowMoq(qty: number, moq: number, kind: string): boolean {
  const floor = effectiveMoq(moq, kind);
  if (floor <= 0) return false;
  return qty <= floor;
}

/** Fire once when stock crosses onto or below MOQ. */
export function shouldAlertOnDecrement(
  qtyBefore: number,
  qtyAfter: number,
  moq: number,
  kind: string,
): boolean {
  const floor = effectiveMoq(moq, kind);
  if (floor <= 0) return false;
  return qtyAfter <= floor && qtyBefore > floor;
}

export function parseMoqInput(raw: unknown): number | null {
  const value = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
