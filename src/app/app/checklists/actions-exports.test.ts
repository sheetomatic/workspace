import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("checklists server actions module", () => {
  it("only exports async functions from the use server file", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "actions.ts"),
      "utf8",
    );

    expect(source.startsWith('"use server"')).toBe(true);
    expect(source).not.toMatch(/^export \{/m);
    expect(source).not.toMatch(/^export const /m);
    expect(source).not.toMatch(/checklistInitialState/);
    expect([...source.matchAll(/^export async function /gm)].length).toBeGreaterThan(0);
  });
});
