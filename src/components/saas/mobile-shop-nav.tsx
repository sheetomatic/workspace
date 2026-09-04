"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_SHOP_NAV_LINKS } from "@/lib/mobile-shop/home-actions";

export function MobileShopNav() {
  const pathname = usePathname();
  return (
    <nav className="ms-shop-nav" aria-label="Mobile shop">
      {MOBILE_SHOP_NAV_LINKS.map((link) => {
        const exact = "exact" in link && link.exact;
        const active = exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            className={active ? "is-active" : undefined}
            href={link.href}
            key={link.href}
          >
            <span>{link.label}</span>
            <small>{link.hi}</small>
          </Link>
        );
      })}
    </nav>
  );
}
