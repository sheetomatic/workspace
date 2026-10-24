import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({create:vi.fn(),limit:vi.fn()}));
vi.mock("@/lib/db",()=>({prisma:{websitePageView:{createMany:mocks.create}}}));
vi.mock("@/lib/rate-limit",()=>({checkRateLimit:mocks.limit}));
import { POST } from "./route";
const event={id:"b1cd7eae-1ee2-4a95-94e7-ae01d237a0b1",visitor:"c1cd7eae-1ee2-4a95-94e7-ae01d237a0b1",path:"/pricing",source:"Meta"};
const request=(body:unknown=event,origin="https://sheetomatic.com")=>new Request("https://sheetomatic.com/api/website-traffic",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.limit.mockResolvedValue({allowed:true});mocks.create.mockResolvedValue({count:1});});
describe("traffic ingestion",()=>{
  it("rejects unrelated origins and private paths",async()=>{
    expect((await POST(request(event,"https://evil.example"))).status).toBe(403);
    expect((await POST(request({...event,path:"/app/leads"}))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("bounds payload size",async()=>{expect((await POST(request({padding:"x".repeat(3000)}))).status).toBe(413);expect(mocks.create).not.toHaveBeenCalled();});
  it("hashes the random visitor ID and deduplicates events",async()=>{
    expect((await POST(request({...event,email:"secret@example.com"}))).status).toBe(204);
    const arg=mocks.create.mock.calls[0][0];expect(arg.skipDuplicates).toBe(true);
    expect(arg.data[0].visitorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(arg)).not.toContain(event.visitor);expect(JSON.stringify(arg)).not.toContain("secret@example.com");
  });
  it("handles rate limits and unavailable storage without exposing database errors",async()=>{
    mocks.limit.mockResolvedValueOnce({allowed:false});expect((await POST(request())).status).toBe(429);
    mocks.create.mockRejectedValueOnce(Error("private database connection"));const response=await POST(request());
    expect(response.status).toBe(503);expect(await response.text()).toBe("");
  });
});
