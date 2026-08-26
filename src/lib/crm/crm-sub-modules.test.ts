import { describe, expect, it } from "vitest";
import {
  applyCrmModuleOrder,
  crmSubModuleIdFromPath,
  moveCrmModuleId,
  resolveMemberCrmSubModules,
} from "@/lib/crm/crm-sub-modules";

describe("CRM sub-modules", () => {
  it("maps Next Time path and keeps Leads index separate", () => {
    expect(crmSubModuleIdFromPath("/app/leads")).toBe("leads");
    expect(crmSubModuleIdFromPath("/app/leads/next-time")).toBe("nextTime");
    expect(crmSubModuleIdFromPath("/app/leads/meetings")).toBe("meetings");
    expect(crmSubModuleIdFromPath("/app/leads/services")).toBe("services");
  });

  it("includes Next Time when a member already has Leads", () => {
    expect(resolveMemberCrmSubModules(["leads", "meetings"])).toEqual(
      expect.arrayContaining(["leads", "nextTime", "meetings"]),
    );
    expect(resolveMemberCrmSubModules(null)).toEqual(
      expect.arrayContaining(["leads", "nextTime", "services"]),
    );
    expect(resolveMemberCrmSubModules(["leads", "quotations"])).toEqual(
      expect.arrayContaining(["services"]),
    );
  });

  it("reorders CRM modules and appends unknown ids", () => {
    const items = [
      { id: "leads" },
      { id: "services" },
      { id: "payments" },
    ];
    expect(
      applyCrmModuleOrder(items, ["payments", "leads"]).map((item) => item.id),
    ).toEqual(["payments", "leads", "services"]);
    expect(moveCrmModuleId(["leads", "services", "payments"], "services", -1)).toEqual(
      ["services", "leads", "payments"],
    );
    expect(moveCrmModuleId(["leads", "services"], "leads", -1)).toEqual([
      "leads",
      "services",
    ]);
  });
});
