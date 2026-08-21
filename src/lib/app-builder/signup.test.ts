import { describe, expect, it } from "vitest";
import { validateAppBuilderSignup } from "@/lib/app-builder/signup";

const valid = {
  name: "Rahul Jain",
  businessName: "Jain Furniture",
  email: "rahul@example.com",
  phone: "9876543210",
  password: "secret123",
  confirmPassword: "secret123",
  teamSize: "6-15",
  industry: "Furniture shop",
  countryId: "c1",
  stateId: "s1",
  cityId: "city1",
};

describe("validateAppBuilderSignup", () => {
  it("accepts a complete App Builder signup", () => {
    expect(validateAppBuilderSignup(valid)).toBeNull();
  });

  it("requires a callable mobile", () => {
    expect(validateAppBuilderSignup({ ...valid, phone: "123" })?.field).toBe("phone");
  });

  it("requires country, state, and city", () => {
    expect(validateAppBuilderSignup({ ...valid, cityId: "" })?.field).toBe("cityId");
  });
});
