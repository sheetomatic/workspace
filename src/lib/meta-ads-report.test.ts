import { afterEach, expect, it, vi } from "vitest";
import { metaAdsReport } from "./meta-ads-report";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("does not fetch without server configuration", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", ""); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await metaAdsReport()).toEqual({ state: "unconfigured" }); expect(fetcher).not.toHaveBeenCalled();
});
it("uses the selected account and keeps the token out of the URL", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only"); const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }); vi.stubGlobal("fetch", fetcher);
  expect(await metaAdsReport()).toEqual({ state: "ready", rows: [] });
  expect(String(fetcher.mock.calls[0][0])).toContain("act_1289822315977891/insights"); expect(String(fetcher.mock.calls[0][0])).not.toContain("test-only");
});
it("does not turn an access failure into zero activity", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only"); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  expect(await metaAdsReport()).toEqual({ state: "unavailable" });
});
