"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  serviceCategories,
  type ServiceCategorySlug,
} from "@/app/services-content";

type ServicesSubNavProps = {
  currentSlug?: ServiceCategorySlug | "hub";
};

function resolveActiveSlug(pathname: string): ServiceCategorySlug | "hub" {
  if (pathname === "/services") {
    return "hub";
  }

  if (!pathname.startsWith("/services/")) {
    return "hub";
  }

  const rest = pathname.replace(/^\/services\/?/, "");
  const firstSegment = rest.split("/")[0];

  if (firstSegment === "hr" || firstSegment.startsWith("hr")) {
    return "hr";
  }

  const match = serviceCategories.find((category) => category.slug === firstSegment);
  return match?.slug ?? "hub";
}

export function ServicesSubNav({ currentSlug = "hub" }: ServicesSubNavProps) {
  const pathname = usePathname();

  const activeSlug =
    currentSlug !== "hub" ? currentSlug : resolveActiveSlug(pathname);

  return (
    <nav className="services-sub-nav" aria-label="Service categories">
      <div className="services-sub-nav-inner mx-auto max-w-6xl px-5 sm:px-8">
        <Link
          className={`services-sub-nav-link${activeSlug === "hub" ? " active" : ""}`}
          href="/services"
        >
          All services
        </Link>
        {serviceCategories.map((category) => (
          <Link
            className={`services-sub-nav-link${activeSlug === category.slug ? " active" : ""}`}
            href={`/services/${category.slug}`}
            key={category.slug}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
