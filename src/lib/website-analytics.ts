import { z } from "zod";
export const META_PIXEL_ID = "2673554139515459";
export function safePixelContext(href: string, referrer: string) {
  try {
    const url=new URL(href);
    if(url.search||url.hash)return false;
    if(referrer){const previous=new URL(referrer);if(previous.search||previous.hash||previous.hostname==="workspace.sheetomatic.com"||previous.pathname.startsWith("/app"))return false;}
    return true;
  }catch{return false;}
}
const pages = new Set(["/", "/about", "/contact", "/pricing", "/templates", "/services", "/products", "/courses", "/career", "/whatsapp-api", "/whatsapp-plans", "/whatsapp-ai", "/ai", "/ai/pricing", "/ai/chatbot", "/ai/crm", "/addons", "/privacy", "/terms", "/terms/services", "/terms/whatsapp-api"]);
export function isPublicAnalyticsPath(path: string) {
  return pages.has(path) || /^\/services\/[a-z-]+(?:\/[a-z-]+)?$/.test(path);
}
export const trafficEventSchema = z.object({
  id: z.string().uuid(), visitor: z.string().uuid(),
  path: z.string().max(160).refine(isPublicAnalyticsPath),
  source: z.enum(["Direct", "Google", "Meta", "LinkedIn", "Other"]),
});
export function trafficSource(referrer: string) {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/(^|\.)(google\.[a-z.]+)$/.test(host)) return "Google";
    if (/(^|\.)(facebook|instagram)\.com$/.test(host)) return "Meta";
    if (/(^|\.)linkedin\.com$/.test(host)) return "LinkedIn";
    if (host === "sheetomatic.com" || host === "www.sheetomatic.com") return "Direct";
    return "Other";
  } catch { return "Direct"; }
}
