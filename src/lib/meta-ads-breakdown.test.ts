import {afterEach,expect,it,vi} from "vitest";
import {metaAdsBreakdown} from "./meta-ads-breakdown";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("requests ad-level data for the fixed account and chosen dates",async()=>{
 vi.stubEnv("META_ADS_ACCESS_TOKEN","test-only");const f=vi.fn().mockResolvedValue({ok:true,json:async()=>({data:[{ad_id:"1"},{ad_id:"2"}],paging:{next:"not-followed"}})});vi.stubGlobal("fetch",f);
 expect(await metaAdsBreakdown(7)).toEqual({state:"ready",rows:[{ad_id:"1"},{ad_id:"2"}],truncated:true});
 const u=String(f.mock.calls[0][0]);expect(u).toContain("act_1289822315977891");expect(u).toContain("level=ad");expect(u).toContain("last_7d");expect(u).not.toContain("test-only");expect(f).toHaveBeenCalledTimes(1);
});
it("does not present a permission failure as no running ads",async()=>{vi.stubEnv("META_ADS_ACCESS_TOKEN","test-only");vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false}));expect(await metaAdsBreakdown(30)).toEqual({state:"unavailable"});});
it("does not call Meta without configuration",async()=>{vi.stubEnv("META_ADS_ACCESS_TOKEN","");const f=vi.fn();vi.stubGlobal("fetch",f);expect(await metaAdsBreakdown(30)).toEqual({state:"unavailable"});expect(f).not.toHaveBeenCalled();});
