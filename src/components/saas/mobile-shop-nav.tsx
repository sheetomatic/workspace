"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MOBILE_SHOP_NAV_BAR,
  MOBILE_SHOP_NAV_MORE,
} from "@/lib/mobile-shop/home-actions";

function linkActive(
  pathname: string,
  link: { href: string; exact?: true },
) {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function MobileShopNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_SHOP_NAV_MORE.some((link) =>
    linkActive(pathname, link),
  );

  return (
    <div className="ms-shop-nav-wrap">
      <nav className="ms-shop-nav" aria-label="Mobile shop">
        {MOBILE_SHOP_NAV_BAR.map((link) => {
          const active = linkActive(pathname, link);
          return (
            <Link
              className={active ? "is-active" : undefined}
              href={link.href}
              key={link.href}
              onClick={() => setMoreOpen(false)}
            >
              <span>{link.label}</span>
              <small>{link.hi}</small>
            </Link>
          );
        })}
        {MOBILE_SHOP_NAV_MORE.map((link) => {
          const active = linkActive(pathname, link);
          return (
            <Link
              className={`ms-shop-nav-extra${active ? " is-active" : ""}`}
              href={link.href}
              key={link.href}
            >
              <span>{link.label}</span>
              <small>{link.hi}</small>
            </Link>
          );
        })}
        <button
          type="button"
          className={`ms-shop-nav-more-btn${moreOpen || moreActive ? " is-active" : ""}`}
          aria-expanded={moreOpen}
          aria-controls="ms-shop-nav-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span>More</span>
          <small>और</small>
        </button>
      </nav>
      {moreOpen ? (
        <div className="ms-shop-nav-more" id="ms-shop-nav-more">
          {MOBILE_SHOP_NAV_MORE.map((link) => {
            const active = linkActive(pathname, link);
            return (
              <Link
                className={active ? "is-active" : undefined}
                href={link.href}
                key={link.href}
                onClick={() => setMoreOpen(false)}
              >
                <span>{link.label}</span>
                <small>{link.hi}</small>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
