/**
 * Late-mark payroll deduction (kept dependency-free to avoid import cycles
 * between payroll and the attendance automation cron).
 */

/** Default late→day ratio (N late marks = 1 day cut) — overridable via env. */
export function lateToDayRatio(): number {
  const raw = Number(process.env.HR_LATE_TO_ABSENT_RATIO ?? 3);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3;
}

/**
 * "N late marks cost one day's pay". Pure so it can be unit-tested.
 */
export function computeLateDeduction(params: {
  lateDays: number;
  ratio: number;
  perDayPay: number;
}): { deductionDays: number; amount: number } {
  const { lateDays, ratio, perDayPay } = params;
  if (ratio <= 0 || lateDays <= 0 || perDayPay <= 0) {
    return { deductionDays: 0, amount: 0 };
  }
  const deductionDays = Math.floor(lateDays / ratio);
  const amount = Math.round(deductionDays * perDayPay * 100) / 100;
  return { deductionDays, amount };
}
