import { describe, expect, it } from "vitest";
import { assertSocialBrief } from "@/lib/social/generate";
import { isBannedSocialIcp } from "@/lib/social/icp";

describe("social ICP", () => {
  it("blocks grocery / kirana stories", () => {
    expect(isBannedSocialIcp("kirana owner counting biscuits")).toBe(true);
    expect(isBannedSocialIcp("jewellery shop in Zaveri")).toBe(false);
  });

  it("asks for a named person and a messy detail", () => {
    expect(
      assertSocialBrief({
        icp: "jewellery",
        format: "image",
        personName: "N",
        shopName: "X",
        messyDetail: "x",
        problem: "late",
      }).ok,
    ).toBe(false);
    expect(
      assertSocialBrief({
        icp: "jewellery",
        format: "carousel",
        personName: "Neeraj",
        shopName: "Mehta Jewellers",
        messyDetail: "Gold book still in a red diary from 2019",
        problem: "Owner compiling collection follow-ups on Sunday night",
      }).ok,
    ).toBe(true);
  });

  it("rejects a kirana brief even with a full story", () => {
    expect(
      assertSocialBrief({
        icp: "services",
        format: "image",
        personName: "Raju",
        shopName: "Raju Kirana",
        messyDetail: "Biscuit boxes stacked near the counter",
        problem: "Stock not matching",
      }).ok,
    ).toBe(false);
  });
});
