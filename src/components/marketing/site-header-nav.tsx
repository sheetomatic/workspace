"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/app/page-content";

function navIsActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeaderNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav
        className="site-nav-mobile hidden max-[1180px]:flex items-center gap-2 overflow-x-auto pb-3"
        aria-label="Main mobile"
      >
        {mainNav.map((item) => {
          const active = navIsActive(pathname, item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap no-underline${active ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="site-nav-saas site-nav-desktop hidden min-[1181px]:flex items-center gap-6"
      aria-label="Main"
    >
      {mainNav.map((item) => {
        const active = navIsActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap text-inherit no-underline hover:text-blue-600${active ? " is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
