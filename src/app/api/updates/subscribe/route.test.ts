import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({configured:vi.fn(),limit:vi.fn(),signup:vi.fn()}));
vi.mock("@/lib/integrations/email",()=>({isEmailConfigured:mocks.configured}));
vi.mock("@/lib/website-updates",()=>({allowUpdatesRequest:mocks.limit,requestWebsiteUpdates:mocks.signup,tokenHash:()=>"test-hash"}));
import { POST } from "./route";
beforeEach(()=>{vi.clearAllMocks();mocks.configured.mockReturnValue(true);mocks.limit.mockResolvedValue(true);mocks.signup.mockResolvedValue(undefined);});
const req=(body:unknown,origin="https://sheetomatic.com")=>new Request("https://sheetomatic.com/api/updates/subscribe",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
describe("subscription HTTP boundary",()=>{
 it("requires consent independent of any analytics choice",async()=>{expect((await POST(req({email:"a@example.com"}))).status).toBe(400);expect(mocks.signup).not.toHaveBeenCalled();});
 it("accepts explicit opted-in normalized email",async()=>{const response=await POST(req({email:" A@EXAMPLE.COM ",consent:true}));expect(response.status).toBe(200);expect(mocks.signup).toHaveBeenCalledWith({email:"a@example.com",consent:true});expect(await response.text()).not.toContain("a@example.com");});
 it("does not write when email is unavailable",async()=>{mocks.configured.mockReturnValue(false);expect((await POST(req({email:"a@example.com",consent:true}))).status).toBe(503);expect(mocks.signup).not.toHaveBeenCalled();});
 it("does not write or send after rate rejection",async()=>{mocks.limit.mockResolvedValue(false);expect((await POST(req({email:"a@example.com",consent:true}))).status).toBe(429);expect(mocks.signup).not.toHaveBeenCalled();});
 it("blocks cross-origin signup",async()=>{expect((await POST(req({email:"a@example.com",consent:true},"https://other.example"))).status).toBe(403);expect(mocks.signup).not.toHaveBeenCalled();});
 it("returns truthful failure without leaking provider details",async()=>{mocks.signup.mockRejectedValue(Error("private provider diagnostic"));const response=await POST(req({email:"a@example.com",consent:true}));expect(response.status).toBe(503);expect(await response.text()).not.toContain("private provider diagnostic");});
});
