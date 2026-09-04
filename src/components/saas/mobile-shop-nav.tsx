"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app/mobile-shop", label: "Home", hi: "होम", exact: true },
  { href: "/app/mobile-shop/sales", label: "New sale", hi: "नया सेल" },
  { href: "/app/mobile-shop/used-in", label: "Used in", hi: "पुराना इन" },
  { href: "/app/mobile-shop/repairs", label: "Repair", hi: "रिपेयर" },
  { href: "/app/mobile-shop/accessories", label: "Accessory", hi: "एक्सेसरी" },
  { href: "/app/mobile-shop/stock", label: "Stock", hi: "स्टॉक" },
];

export function MobileShopNav() {
  const pathname = usePathname();
  return (
    <nav className="ms-shop-nav" aria-label="Mobile shop">
      {LINKS.map((link) => {
        const active = link.exact
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
