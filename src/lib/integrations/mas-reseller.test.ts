import { describe, expect, it } from "vitest";
import {
  extractMasResellerCustomers,
  parseMasResellerCustomer,
} from "@/lib/integrations/mas-reseller";

const sample = {
  result: {
    content: [
      {
        id: 50989,
        username: "NathSarso",
        mobile: "919199097195",
        email: "contact@nathelectricworks.com",
        accountType: "Regular",
        creditPoints: 9709,
        validUpto: "2027-08-19 10:09:50",
      },
      {
        id: 49130,
        username: "Pay10",
        contact: "919311090583",
        accountType: "Inactive",
        creditPoints: 0,
      },
    ],
  },
};

describe("Web Based API reseller customer parse", () => {
  it("reads panel customers from a paged result", () => {
    const rows = extractMasResellerCustomers(sample).map(parseMasResellerCustomer);
    expect(rows[0]).toMatchObject({
      externalId: "50989",
      username: "NathSarso",
      phone: "919199097195",
      accountGroup: "REGULAR",
      creditPoints: 9709,
      expiresAt: "2027-08-19",
    });
    expect(rows[1]).toMatchObject({
      externalId: "49130",
      accountGroup: "INACTIVE",
      creditPoints: 0,
    });
  });
});
