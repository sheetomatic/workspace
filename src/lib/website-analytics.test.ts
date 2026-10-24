import { describe, expect, it } from "vitest";
import { isPublicAnalyticsPath, trafficEventSchema, trafficSource, META_PIXEL_ID } from "./website-analytics";
describe("website traffic privacy boundaries", () => {
  it("uses the confirmed pixel, never the blank snippet", () => expect(META_PIXEL_ID).toBe("2673554139515459"));
  it.each(["/app", "/app/leads", "/login", "/quotation/private-token", "/courses/book-slots", "/contact?email=person@example.com", "/api/auth", "/services/../../app"])("excludes %s", path => expect(isPublicAnalyticsPath(path)).toBe(false));
  it("accepts public pages and stores only coarse referrer categories", () => {
    expect(isPublicAnalyticsPath("/services/flow")).toBe(true);
    expect(trafficSource("https://www.facebook.com/private?token=secret")).toBe("Meta");
    expect(trafficSource("https://example.com/person@example.com")).toBe("Other");
  });
  it("validates event IDs and discards unknown fields", () => {
    const event={id:"b1cd7eae-1ee2-4a95-94e7-ae01d237a0b1",visitor:"c1cd7eae-1ee2-4a95-94e7-ae01d237a0b1",path:"/",source:"Direct",email:"private@example.com"};
    expect(trafficEventSchema.parse(event)).not.toHaveProperty("email");
    expect(trafficEventSchema.safeParse({...event,id:"bad"}).success).toBe(false);
  });
});
