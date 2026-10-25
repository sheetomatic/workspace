import { afterEach, expect, it, vi } from "vitest";
import { metaAdsReport } from "./meta-ads-report";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("does not fetch without server configuration", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", ""); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await metaAdsReport()).toEqual({ state: "unconfigured" }); expect(fetcher).not.toHaveBeenCalled();
});
it("uses the selected account and keeps the token out of the URL", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only"); const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }); vi.stubGlobal("fetch", fetcher);
  expect(await metaAdsReport()).toEqual({ state: "ready", rows: [], daily: [] });
  expect(String(fetcher.mock.calls[0][0])).toContain("act_1289822315977891/insights"); expect(String(fetcher.mock.calls[0][0])).not.toContain("test-only");
});
it("uses seven-day daily data without summing unique reach", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only");
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{reach:"100"}]})}).mockResolvedValueOnce({ok:true,json:async()=>({data:[{reach:"80"},{reach:"70"}]})});vi.stubGlobal("fetch",fetcher);
  const report=await metaAdsReport(7);
  expect(String(fetcher.mock.calls[0][0])).toContain("last_7d");expect(String(fetcher.mock.calls[1][0])).toContain("time_increment=1");
  expect(report).toMatchObject({state:"ready",rows:[{reach:"100"}],daily:[{reach:"80"},{reach:"70"}]});
});
it("preserves summary when daily access fails", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only");vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{spend:"9.42"}]})}).mockRejectedValueOnce(new Error("timeout")));
  expect(await metaAdsReport()).toEqual({state:"ready",rows:[{spend:"9.42"}],daily:null});
});
it("does not show an incomplete paginated daily chart", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only");vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[]})}).mockResolvedValueOnce({ok:true,json:async()=>({data:[{}],paging:{next:"unused"}})}));
  expect(await metaAdsReport()).toEqual({state:"ready",rows:[],daily:null});
});
it("does not turn an access failure into zero activity", async () => {
  vi.stubEnv("META_ADS_ACCESS_TOKEN", "test-only"); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  expect(await metaAdsReport()).toEqual({ state: "unavailable" });
});
