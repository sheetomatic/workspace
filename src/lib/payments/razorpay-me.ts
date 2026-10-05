/** Hosted Razorpay.me page. Customers would otherwise type the amount themselves. */
export const SHEETOMATIC_RAZORPAY_ME_URL =
  "https://razorpay.me/@sheetomatictechnologies";

const MAX_AMOUNT_INR = 10_000_000;

export type RazorpayHandleConfig = {
  keylessHeader: string;
  paymentLinkId: string;
  merchantName: string;
  brandColor: string;
};

export function normalizeRazorpayAmountInr(amountInr: number): number | null {
  if (!Number.isFinite(amountInr)) return null;
  const rupees = Math.round(amountInr);
  if (rupees < 1 || rupees > MAX_AMOUNT_INR) return null;
  return rupees;
}

/** Read the public payment-handle bootstrap so Checkout can open with an amount. */
export function readRazorpayHandleConfig(html: string): RazorpayHandleConfig {
  const data = parseHandleData(html);
  const paymentLink = data.payment_link;
  const merchant = data.merchant;
  const keylessHeader = data.keyless_header;
  const paymentLinkId =
    paymentLink && typeof paymentLink === "object" && "id" in paymentLink
      ? paymentLink.id
      : null;
  const merchantName =
    merchant && typeof merchant === "object" && "name" in merchant ? merchant.name : null;
  const brandColor =
    merchant && typeof merchant === "object" && "brand_color" in merchant
      ? merchant.brand_color
      : null;
  if (
    typeof keylessHeader !== "string" ||
    typeof paymentLinkId !== "string" ||
    typeof merchantName !== "string"
  ) {
    throw new Error("Razorpay page did not include checkout data.");
  }
  return {
    keylessHeader,
    paymentLinkId,
    merchantName,
    brandColor: typeof brandColor === "string" && brandColor ? brandColor : "#2371ec",
  };
}

function parseHandleData(html: string): Record<string, unknown> {
  const marker = "var data = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("Razorpay page did not include payment data.");
  const jsonStart = start + marker.length;
  const jsonEnd = endOfJsonObject(html, jsonStart);
  if (jsonEnd < 0) throw new Error("Razorpay payment data could not be read.");
  return JSON.parse(html.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
}

function endOfJsonObject(html: string, jsonStart: number): number {
  if (html[jsonStart] !== "{") return -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = jsonStart; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
