"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardCheck,
  LayoutDashboard,
  Package,
  PackageSearch,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Package;
  description: string;
};

const items: NavItem[] = [
  {
    href: "/app/ims",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Value, alerts, ABC split",
  },
  {
    href: "/app/ims/items",
    label: "Items",
    icon: Package,
    description: "Master data and QC policy",
  },
  {
    href: "/app/ims/stock",
    label: "Stock",
    icon: PackageSearch,
    description: "Levels and status colours",
  },
  {
    href: "/app/ims/move",
    label: "Movements",
    icon: ArrowLeftRight,
    description: "RM In, issue, FG In/Out",
  },
  {
    href: "/app/ims/qc",
    label: "QC queue",
    icon: ClipboardCheck,
    description: "Pass or fail receipts",
  },
];

function navIsActive(pathname: string, href: string) {
  if (href === "/app/ims") {
    return pathname === "/app/ims";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ImsModuleNav() {
  const pathname = usePathname();

  return (
    <nav className="ws-module-subnav ws-ims-subnav" aria-label="Inventory navigation">
      <div className="ws-module-subnav-brand">
        <Package size={18} aria-hidden />
        <div>
          <strong>Inventory</strong>
          <span>IMS - RM and FG stores</span>
        </div>
      </div>
      <ul className="ws-module-subnav-list">
        {items.map((item) => {
          const Icon = item.icon;
          const active = navIsActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`ws-module-subnav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} aria-hidden />
                <span>
                  {item.label}
                  <small>{item.description}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
