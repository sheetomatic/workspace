import { describe, expect, it } from "vitest";
import { isReservedOrganizationSlug, slugifyOrganizationName } from "@/lib/org-slug";
import { parseProvisionWorkspaceInput } from "@/lib/workspace-provision";

describe("parseProvisionWorkspaceInput", () => {
  it("accepts a Tasks-only client workspace", () => {
    const parsed = parseProvisionWorkspaceInput({
      businessName: "Ketan Tasks Co",
      ownerName: "Ketan Shah",
      ownerEmail: "ketan@example.com",
      bundle: "tasks_addon",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.bundle).toBe("tasks_addon");
      expect(parsed.value.ownerEmail).toBe("ketan@example.com");
    }
  });

  it("rejects a missing company or invalid email", () => {
    expect(
      parseProvisionWorkspaceInput({
        businessName: "",
        ownerName: "Ketan",
        ownerEmail: "ketan@example.com",
        bundle: "tasks_addon",
      }).ok,
    ).toBe(false);
    expect(
      parseProvisionWorkspaceInput({
        businessName: "Ketan Tasks Co",
        ownerName: "Ketan",
        ownerEmail: "not-an-email",
        bundle: "tasks_addon",
      }).ok,
    ).toBe(false);
  });
});

describe("reserved workspace slugs", () => {
  it("blocks platform and dedicated portal slugs", () => {
    expect(isReservedOrganizationSlug("sheetomatic-technologies")).toBe(true);
    expect(isReservedOrganizationSlug("hingorani")).toBe(true);
    expect(isReservedOrganizationSlug("workspace")).toBe(true);
    expect(isReservedOrganizationSlug("ketan-tasks-co")).toBe(false);
  });

  it("slugifies a client company name", () => {
    expect(slugifyOrganizationName("Ketan Tasks Co")).toBe("ketan-tasks-co");
  });
});
