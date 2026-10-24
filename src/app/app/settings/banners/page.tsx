import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { bannerConfig } from "@/lib/marketing-banners";
import { BannerEditor } from "@/components/saas/banner-editor";

export default async function BannersPage() {
  const organization = await requireBannerAdmin();
  return <div className="saas-page"><h1>Website banners</h1><p>Manage the public homepage carousel. Saving publishes the changes. The first item appears first.</p><BannerEditor initial={bannerConfig(organization.workspaceAppearance)} /></div>;
}
