import { describe, expect, it } from "vitest";
import { pdfBase64, renderTextPdf } from "./pdf";

describe("row PDF", () => {
  it("writes a %PDF document", () => {
    const bytes = renderTextPdf("Rina quote", ["Company: East Infra", "Value: 240000"]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Rina quote");
    expect(text).toContain("%%EOF");
    expect(pdfBase64(bytes).length).toBeGreaterThan(40);
  });
});
