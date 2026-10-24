import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { bannerConfig } from "@/lib/marketing-banners";
import { BannerEditor } from "@/components/saas/banner-editor";

export default async function BannersPage() {
  const organization = await requireBannerAdmin();
  return <div className="saas-page"><h1>Website banners</h1><p>Manage the scrolling offer strip at the top of the public homepage. Saving publishes the changes. The first item runs first; all offers and links are available under “View all offers”.</p><BannerEditor initial={bannerConfig(organization.workspaceAppearance)} /></div>;
}
