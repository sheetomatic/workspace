import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

const marketingRoutes = [
  "",
  "/ai",
  "/ai/pricing",
  "/pricing",
  "/services",
  "/products",
  "/courses",
  "/about",
  "/career",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return marketingRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
