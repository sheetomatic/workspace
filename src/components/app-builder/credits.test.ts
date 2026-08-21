import { describe, expect, it } from "vitest";
import { readCredits, WELCOME_CREDITS } from "@/components/app-builder/credits";

describe("app builder credits", () => {
  it("does not touch localStorage on the server", () => {
    expect(readCredits()).toBe(WELCOME_CREDITS);
  });
});
