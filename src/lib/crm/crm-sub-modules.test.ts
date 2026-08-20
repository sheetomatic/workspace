import { describe, expect, it } from "vitest";
import {
  crmSubModuleIdFromPath,
  resolveMemberCrmSubModules,
} from "@/lib/crm/crm-sub-modules";

describe("CRM sub-modules", () => {
  it("maps Next Time path and keeps Leads index separate", () => {
    expect(crmSubModuleIdFromPath("/app/leads")).toBe("leads");
    expect(crmSubModuleIdFromPath("/app/leads/next-time")).toBe("nextTime");
    expect(crmSubModuleIdFromPath("/app/leads/meetings")).toBe("meetings");
  });

  it("includes Next Time when a member already has Leads", () => {
    expect(resolveMemberCrmSubModules(["leads", "meetings"])).toEqual(
      expect.arrayContaining(["leads", "nextTime", "meetings"]),
    );
    expect(resolveMemberCrmSubModules(null)).toEqual(
      expect.arrayContaining(["leads", "nextTime"]),
    );
  });
});
