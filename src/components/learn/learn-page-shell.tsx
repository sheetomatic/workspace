import type { ReactNode } from "react";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { isLearnPortalRequest } from "@/lib/tenant-host";

export async function LearnPageShell({ children }: { children: ReactNode }) {
  if (await isLearnPortalRequest()) {
    return <div className="learn-portal-page">{children}</div>;
  }

  return (
    <MarketingPage>
      <SiteHeader />
      {children}
      <SiteFooter />
    </MarketingPage>
  );
}
