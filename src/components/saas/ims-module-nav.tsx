"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package } from "lucide-react";
import {
  IMS_NAV_SECTIONS,
  imsNavIsActive,
  imsNavItemKey,
  type ImsNavItem,
} from "@/lib/ims/store-nav";

export function ImsModuleNav() {
  const pathname = usePathname();

  return (
    <nav className="ws-module-subnav ws-ims-subnav" aria-label="Inventory navigation">
      <div className="ws-module-subnav-brand">
        <Package size={18} aria-hidden />
        <div>
          <strong>Store</strong>
          <span>IMS — MR, GRN, MIN, stock</span>
        </div>
      </div>
      {IMS_NAV_SECTIONS.map((section) => (
        <div key={section.title} className="ws-module-subnav-section">
          <span className="ws-module-subnav-section-title">{section.title}</span>
          <ul className="ws-module-subnav-list">
            {section.items.map((item) => (
              <ImsNavLink key={imsNavItemKey(item)} item={item} pathname={pathname} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ImsNavLink({ item, pathname }: { item: ImsNavItem; pathname: string }) {
  const Icon = item.icon;
  const active = imsNavIsActive(pathname, item.href);

  return (
    <li>
      <Link
        href={item.href}
        className={`ws-module-subnav-link${active ? " is-active" : ""}${item.phase2 ? " ws-module-subnav-link-phase2" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={16} aria-hidden />
        <span>
          {item.label}
          <small>
            {item.description}
            {item.phase2 ? " · Soon" : ""}
          </small>
        </span>
      </Link>
    </li>
  );
}
