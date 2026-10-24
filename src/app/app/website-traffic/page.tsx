import { WebsiteTrafficDashboard } from "@/components/saas/website-traffic-dashboard";
export default async function WebsiteTrafficPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams;
  return <WebsiteTrafficDashboard days={params.days === "7" ? 7 : 30} basePath="/app/website-traffic" />;
}
