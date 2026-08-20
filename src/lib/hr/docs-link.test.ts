import { afterEach, describe, expect, it } from "vitest";
import {
  buildEmployeeDocsPublicUrl,
  buildWhatsAppMeUrl,
  createEmployeeDocsToken,
  employeeDocsRequestCopy,
  EMPLOYEE_DOCS_LINK_TTL_MS,
  verifyEmployeeDocsToken,
} from "@/lib/hr/docs-link";

const previousSite = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (previousSite == null) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = previousSite;
  }
});

describe("employee docs link token", () => {
  it("round-trips a signed token", () => {
    const now = Date.UTC(2026, 7, 20, 9, 0, 0);
    const token = createEmployeeDocsToken("prof_1", "org_1", now);
    expect(verifyEmployeeDocsToken(token, now)).toEqual({
      p: "prof_1",
      o: "org_1",
      e: now + EMPLOYEE_DOCS_LINK_TTL_MS,
    });
  });

  it("rejects a tampered token and an expired token", () => {
    const now = Date.UTC(2026, 7, 20, 9, 0, 0);
    const token = createEmployeeDocsToken("prof_1", "org_1", now);
    expect(verifyEmployeeDocsToken(`${token}x`, now)).toBeNull();
    expect(
      verifyEmployeeDocsToken(token, now + EMPLOYEE_DOCS_LINK_TTL_MS + 1),
    ).toBeNull();
  });

  it("builds a public URL and WhatsApp deep link", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sheetomatic.com/";
    expect(buildEmployeeDocsPublicUrl("abc.def")).toBe(
      "https://sheetomatic.com/hr/docs/abc.def",
    );
    expect(buildWhatsAppMeUrl("9876543210", "Upload docs")).toBe(
      `https://wa.me/919876543210?text=${encodeURIComponent("Upload docs")}`,
    );
  });

  it("lists missing documents in the message", () => {
    const copy = employeeDocsRequestCopy({
      employeeName: "Sumit",
      organizationName: "Sheetomatic",
      url: "https://sheetomatic.com/hr/docs/t",
      missingLabels: ["Aadhaar", "PAN"],
    });
    expect(copy.subject).toContain("pending HR documents");
    expect(copy.text).toContain("Aadhaar, PAN");
    expect(copy.text).toContain("save as draft");
  });
});
