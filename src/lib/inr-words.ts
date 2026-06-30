const ONES = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

function wordsBelow100(value: number): string {
  if (value < 20) {
    return ONES[value]!;
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]!;
}

function wordsBelow1000(value: number): string {
  if (value < 100) {
    return wordsBelow100(value);
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return remainder
    ? `${ONES[hundreds]} Hundred ${wordsBelow100(remainder)}`
    : `${ONES[hundreds]} Hundred`;
}

function integerToIndianWords(value: number): string {
  if (value === 0) {
    return "Zero";
  }

  const parts: string[] = [];
  let remaining = value;

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  if (crore) {
    parts.push(`${wordsBelow1000(crore)} Crore`);
  }
  if (lakh) {
    parts.push(`${wordsBelow1000(lakh)} Lakh`);
  }
  if (thousand) {
    parts.push(`${wordsBelow1000(thousand)} Thousand`);
  }
  if (remaining) {
    parts.push(wordsBelow1000(remaining));
  }

  return parts.join(" ");
}

export function formatInrInWords(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "";
  }

  const rounded = Math.round(amount);
  if (rounded === 0) {
    return "Rupees Zero Only";
  }

  if (rounded < 0) {
    const positiveWords = formatInrInWords(-rounded)
      .replace(/^Rupees\s+/, "")
      .replace(/\s+Only$/, "");
    return `Rupees Minus ${positiveWords} Only`;
  }

  return `Rupees ${integerToIndianWords(rounded)} Only`;
}
