"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type OrganizationOption = {
  slug: string;
  name: string;
  role: string;
  isPrimary?: boolean;
};

export function OrganizationSwitcher({
  organizations,
  currentSlug,
}: {
  organizations: OrganizationOption[];
  currentSlug: string;
}) {
  const { update } = useSession();
  const router = useRouter();
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
      router.push("/app/tasks");
      router.refresh();
    });
  }

  return (
    <label className="saas-org-switcher">
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
