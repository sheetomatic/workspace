import { GST_STATE_OPTIONS, splitGstLine } from "@/lib/leads/gst-invoice";

export const TASKS_GST_RATE = 18;
export const TASKS_SAC = "998313";
export const TASKS_MONTHLY_PER_USER_INR = 300;
export const TASKS_MONTHLY_MINIMUM_USERS = 8;
export const TASKS_YEARLY_PER_USER_INR = 2500;
export const TASKS_WHATSAPP_YEARLY_INR = 10000;

export type TasksBillingPeriod = "monthly" | "yearly";

export function tasksCheckoutLines(input: { period: TasksBillingPeriod; users: number; whatsappApi: boolean }) {
  if (!Number.isSafeInteger(input.users) || input.users < 1 || input.users > 250) throw new Error("Choose between 1 and 250 users.");
  const monthlyBilledUsers = Math.max(input.users, TASKS_MONTHLY_MINIMUM_USERS);
  const lines = input.period === "monthly"
    ? [{
        name: `Tasks Management — ${monthlyBilledUsers} billed user${monthlyBilledUsers > 1 ? "s" : ""} for 1 month${input.users < TASKS_MONTHLY_MINIMUM_USERS ? ` (8-user minimum; ${input.users} selected)` : ""}`,
        priceInr: monthlyBilledUsers * TASKS_MONTHLY_PER_USER_INR,
        quantity: monthlyBilledUsers,
      }]
    : [{ name: `Tasks Management — ${input.users} user${input.users > 1 ? "s" : ""} (1 year)`, priceInr: input.users * TASKS_YEARLY_PER_USER_INR, quantity: input.users }];
  if (input.whatsappApi) lines.push({ name: "WhatsApp API add-on (1 year)", priceInr: TASKS_WHATSAPP_YEARLY_INR, quantity: 1 });
  return lines;
}

export function tasksCheckoutTotals(prices: number[], buyerState: string, sellerState: string) {
  if (!GST_STATE_OPTIONS.some(state => state.code === buyerState) || !GST_STATE_OPTIONS.some(state => state.code === sellerState)) throw new Error("Invalid billing state.");
  const lines = prices.map(taxable => splitGstLine({ taxable, gstRate: TASKS_GST_RATE, placeOfSupplyCode: buyerState, sellerStateCode: sellerState }));
  const sum = (key: "taxable" | "cgstAmount" | "sgstAmount" | "igstAmount" | "gstAmount" | "totalAmount") =>
    lines.reduce((total, line) => total + Math.round(line[key] * 100), 0);
  return { lines, subtotalPaise: sum("taxable"), cgstPaise: sum("cgstAmount"), sgstPaise: sum("sgstAmount"), igstPaise: sum("igstAmount"), gstPaise: sum("gstAmount"), totalPaise: sum("totalAmount") };
}
