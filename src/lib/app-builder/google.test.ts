import { describe, expect, it } from "vitest";
import {
  appBuilderGoogleRedirectUri,
  signAppBuilderGoogleState,
  valuesToTab,
  verifyAppBuilderGoogleState,
} from "@/lib/app-builder/google";

describe("app builder google oauth helpers", () => {
  it("builds the workspace callback from forwarded host", () => {
    const request = new Request("http://127.0.0.1/api/app-builder/google/start", {
      headers: {
        "x-forwarded-host": "workspace.sheetomatic.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(appBuilderGoogleRedirectUri(request)).toBe(
      "https://workspace.sheetomatic.com/api/app-builder/google/callback",
    );
  });

  it("rejects expired or tampered oauth state", () => {
    const signed = signAppBuilderGoogleState({
      orgId: "org_1",
      nonce: "abc",
      exp: Date.now() + 60_000,
    });
    expect(verifyAppBuilderGoogleState(signed)?.orgId).toBe("org_1");
    expect(verifyAppBuilderGoogleState(`${signed}x`)).toBeNull();
    expect(
      verifyAppBuilderGoogleState(
        signAppBuilderGoogleState({
          orgId: "org_1",
          nonce: "abc",
          exp: Date.now() - 1,
        }),
      ),
    ).toBeNull();
  });

  it("maps sheet values into workbook tabs", () => {
    const tab = valuesToTab("Orders", [
      ["Order No", "Amount"],
      ["SO-1", "1200"],
      ["SO-2", ""],
    ]);
    expect(tab.headers).toEqual(["Order No", "Amount"]);
    expect(tab.rows[0]?.cells["Order No"]).toBe("SO-1");
    expect(tab.rows[0]?.cells.Amount).toBe(1200);
  });
});
