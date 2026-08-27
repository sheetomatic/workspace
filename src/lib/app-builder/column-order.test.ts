import { describe, expect, it } from "vitest";
import { moveColumnHeaders } from "./column-order";

describe("moveColumnHeaders", () => {
  it("moves a column left and right", () => {
    const headers = ["Party Name", "Phone", "City"];
    expect(moveColumnHeaders(headers, "Phone", -1)).toEqual([
      "Phone",
      "Party Name",
      "City",
    ]);
    expect(moveColumnHeaders(headers, "Phone", 1)).toEqual([
      "Party Name",
      "City",
      "Phone",
    ]);
  });

  it("stays put at the edges", () => {
    const headers = ["Party Name", "Phone"];
    expect(moveColumnHeaders(headers, "Party Name", -1)).toEqual(headers);
    expect(moveColumnHeaders(headers, "Phone", 1)).toEqual(headers);
  });
});
