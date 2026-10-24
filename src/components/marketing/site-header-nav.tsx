"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { mainNav } from "@/app/page-content";
import { marketingNavIsActive } from "@/lib/marketing-navigation";
import styles from "./site-header-nav.module.css";

function NavLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending}>{label}</span>;
}

export function SiteHeaderNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    if (variant !== "mobile") return;
    const nav = mobileNav.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !selected || !nav.clientWidth) return;
    const frame = nav.getBoundingClientRect();
    const tab = selected.getBoundingClientRect();
    if (tab.left < frame.left || tab.right > frame.right) {
      nav.scrollLeft += tab.left - frame.left - (frame.width - tab.width) / 2;
    }
  }, [pathname, variant]);

  if (variant === "mobile") {
    return (
      <nav
        ref={mobileNav}
        className={`site-nav-mobile hidden max-[1180px]:flex items-center overflow-x-auto pb-3 ${styles.navigation} ${styles.mobile}`}
        aria-label="Main mobile"
      >
        {mainNav.map((item) => {
          const active = marketingNavIsActive(pathname, item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`shrink-0 ${styles.item}`}
              href={item.href}
              key={item.href}
            >
              <NavLabel label={item.label} />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className={`site-nav-saas site-nav-desktop hidden min-[1181px]:flex items-center ${styles.navigation} ${styles.desktop}`}
      aria-label="Main"
    >
      {mainNav.map((item) => {
        const active = marketingNavIsActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`shrink-0 ${styles.item}`}
            href={item.href}
            key={item.href}
          >
            <NavLabel label={item.label} />
          </Link>
        );
      })}
    </nav>
  );
}
