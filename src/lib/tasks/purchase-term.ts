import { TASKS_MONTHLY_MINIMUM_USERS, type TasksBillingPeriod } from "./checkout-commerce";

/** Calendar term in IST, clamped to the last day of the target month. */
export function tasksPurchaseTerm(period: TasksBillingPeriod, users: number, start: Date) {
  if (!["monthly", "yearly"].includes(period) || !Number.isInteger(users) || users < 1 || users > 250 || !Number.isFinite(start.getTime())) throw new Error("Invalid purchased term.");
  const local = new Date(start.getTime() + 330 * 60_000);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + (period === "monthly" ? 1 : 12));
  const last = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, last));
  return { seats: period === "monthly" ? Math.max(users, TASKS_MONTHLY_MINIMUM_USERS) : users, endsAt: new Date(local.getTime() - 330 * 60_000) };
}
