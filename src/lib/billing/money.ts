/** Integer paise helpers for Sheetomatic subscription invoices. */

export const INR_PAISE = 100;

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * INR_PAISE);
}

export function paiseToRupees(paise: number) {
  return paise / INR_PAISE;
}

export function formatInrPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % INR_PAISE === 0 ? 0 : 2,
  }).format(paiseToRupees(paise));
}

export function parseRupeesInput(value: string) {
  const cleaned = value.replace(/[,\s₹]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return rupeesToPaise(n);
}

export function applyGst(taxablePaise: number, gstPercent: number) {
  const gstPaise = Math.round((taxablePaise * gstPercent) / 100);
  return {
    taxablePaise,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
  };
}
