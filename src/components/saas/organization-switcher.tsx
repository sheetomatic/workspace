"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { tenantPortalOrigin } from "@/lib/workspace-auth-links";

export type OrganizationOption = {
  slug: string;
  name: string;
  role: string;
  isPrimary?: boolean;
};

export function OrganizationSwitcher({
  organizations,
  currentSlug,
  className,
}: {
  organizations: OrganizationOption[];
  currentSlug: string;
  className?: string;
}) {
  const { update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  if (organizations.length <= 1) {
    return null;
  }

  function switchOrg(slug: string) {
    if (slug === currentSlug || pending) {
      return;
    }

    startTransition(async () => {
      await update({ organizationSlug: slug });

      if (pathname.startsWith("/ai/app")) {
        router.push("/ai/app");
        router.refresh();
        return;
      }

      const protocol =
        window.location.protocol === "http:" ? "http" : "https";
      const targetPath = pathname.startsWith("/app") ? pathname : "/app";
      window.location.href = `${tenantPortalOrigin(slug, protocol)}${targetPath}`;
    });
  }

  const switcherClassName = className
    ? `saas-org-switcher ${className}`
    : "saas-org-switcher";

  return (
    <label className={switcherClassName}>
      <span>Workspace</span>
      <select
        disabled={pending}
        value={currentSlug}
        onChange={(event) => switchOrg(event.target.value)}
      >
        {organizations.map((org) => (
          <option key={org.slug} value={org.slug}>
            {org.name}
          </option>
        ))}
      </select>
    </label>
  );
}
