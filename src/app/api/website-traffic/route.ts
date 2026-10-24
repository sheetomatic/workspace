import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { trafficEventSchema } from "@/lib/website-analytics";
import { checkRateLimit } from "@/lib/rate-limit";
import { pruneWebsiteAnalytics } from "@/lib/website-analytics-retention";
export async function POST(request: Request) {
  if (!["https://sheetomatic.com","https://www.sheetomatic.com"].includes(request.headers.get("origin") ?? "")) return new Response(null,{status:403});
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null,{status:415});
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
  const chunks: Uint8Array[]=[];let size=0;
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>2048){await reader.cancel();return new Response(null,{status:413});}chunks.push(next.value);}
  const body=Buffer.concat(chunks).toString("utf8");
  let input;try {input=trafficEventSchema.safeParse(JSON.parse(body));}catch{return new Response(null,{status:400});}
  if(!input.success)return new Response(null,{status:400});
  const day=new Date().toISOString().slice(0,10);
  const networkHash=createHash("sha256").update(`${day}:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}`).digest("hex");
  if(!(await checkRateLimit(`traffic-network:${networkHash}`,300,60000)).allowed)return new Response(null,{status:429});
  const visitorHash=createHash("sha256").update(`${day}:${input.data.visitor}`).digest("hex");
  const limit=await checkRateLimit(`website-traffic:${visitorHash}`,60,60000);
  if(!limit.allowed)return new Response(null,{status:429});
  try {
    await pruneWebsiteAnalytics();
    await prisma.websitePageView.createMany({data:[{id:input.data.id,visitorHash,path:input.data.path,source:input.data.source}],skipDuplicates:true});
    return new Response(null,{status:204});
  }catch{return new Response(null,{status:503});}
}
