import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
export const bannerSchema = z.object({
  label: text(80), title: text(160), description: text(300),
  action: text(80), note: text(240),
  href: text(2048).refine((value) => {
    if (/[\\\s\u0000-\u001f]/.test(value)) return false;
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
  }, "Use a local /path or an HTTPS URL without embedded credentials."),
});
export const bannersSchema = z.array(bannerSchema).max(12);
export type MarketingBanner = z.infer<typeof bannerSchema>;
export const defaultBanners: MarketingBanner[] = [
  { label: "Sheetomatic · Diwali offer", title: "Light up your business. Not your setup bill.", description: "No setup cost. Pay only for the services.", action: "Discuss your requirements", href: "/contact?offer=diwali", note: "Tell us what you need and get your service quote." },
  { label: "Discover AgentDaftar", title: "Explore AgentDaftar this festive season.", description: "Visit AgentDaftar through Sheetomatic’s referral link.", action: "Explore AgentDaftar", href: "https://app.agentdaftar.com/r/sheetomatic", note: "External referral link · AgentDaftar’s pricing and terms apply." },
  { label: "Discover SunSed", title: "Build apps with SunSed.", description: "Use code SHEETOMATIC and get 1,000 AI credits when you subscribe.", action: "Explore SunSed", href: "https://sunsed.com/?via=sheetomatic", note: "Referral code: SHEETOMATIC · Subscription required. SunSed’s offer terms apply." },
];
export function bannerConfig(appearance: unknown) {
  const value = appearance && typeof appearance === "object" && !Array.isArray(appearance)
    ? (appearance as Record<string, unknown>).websiteBanners : undefined;
  if (!value || typeof value !== "object") return { version: 0, banners: defaultBanners };
  const parsed = z.object({ version: z.number().int().nonnegative(), banners: bannersSchema }).safeParse(value);
  return parsed.success ? parsed.data : { version: 0, banners: defaultBanners };
}
