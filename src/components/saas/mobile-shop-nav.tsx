"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app/mobile-shop", label: "Home" },
  { href: "/app/mobile-shop/stock", label: "Stock" },
  { href: "/app/mobile-shop/repairs", label: "Repairs" },
  { href: "/app/mobile-shop/accessories", label: "Accessories" },
  { href: "/app/mobile-shop/sales", label: "Sales" },
];

export function MobileShopNav() {
  const pathname = usePathname();
  return (
    <nav className="ms-shop-nav" aria-label="Mobile shop">
      {LINKS.map((link) => {
        const active =
          link.href === "/app/mobile-shop"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            className={active ? "is-active" : undefined}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
