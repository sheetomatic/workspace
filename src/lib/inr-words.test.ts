import { describe, expect, it } from "vitest";
import { formatInrInWords } from "@/lib/inr-words";

describe("formatInrInWords", () => {
  it("formats common Indian amounts", () => {
    expect(formatInrInWords(0)).toBe("Rupees Zero Only");
    expect(formatInrInWords(1)).toBe("Rupees One Only");
    expect(formatInrInWords(10)).toBe("Rupees Ten Only");
    expect(formatInrInWords(100)).toBe("Rupees One Hundred Only");
    expect(formatInrInWords(1000)).toBe("Rupees One Thousand Only");
    expect(formatInrInWords(10000)).toBe("Rupees Ten Thousand Only");
    expect(formatInrInWords(100000)).toBe("Rupees One Lakh Only");
    expect(formatInrInWords(1000000)).toBe("Rupees Ten Lakh Only");
    expect(formatInrInWords(10000000)).toBe("Rupees One Crore Only");
    expect(formatInrInWords(100001)).toBe("Rupees One Lakh One Only");
    expect(formatInrInWords(12500050)).toBe(
      "Rupees One Crore Twenty Five Lakh Fifty Only",
    );
  });
});
