/** Client-safe INR label for CRM nav badges. */
export function formatCrmNavValue(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "₹0";
  }
  if (amount >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  }
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)}L`;
  }
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
