"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LEGAL_VIEWS,
  legalViewPath,
  type LegalViewKey,
} from "@/lib/legal-cases/views";

export function LegalViewsNav({
  counts,
}: {
  counts: { all: number; running: number };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(key: LegalViewKey) {
    const base = legalViewPath(key);
    const category = searchParams.get("category");
    if (!category) return base;
    return `${base}?category=${encodeURIComponent(category)}`;
  }

  function isActive(key: LegalViewKey) {
    if (key === "all") return pathname === "/app/cases/list";
    return pathname === `/app/cases/views/${key}`;
  }

  const countFor = (key: LegalViewKey) => {
    if (key === "all") return counts.all;
    if (key === "running") return counts.running;
    return null;
  };

  return (
    <nav aria-label="Case views" className="legal-views-nav">
      {LEGAL_VIEWS.map((view) => {
        const count = countFor(view.key);
        return (
          <Link
            key={view.key}
            aria-current={isActive(view.key) ? "page" : undefined}
            className={`legal-view-tab${isActive(view.key) ? " is-active" : ""}`}
            href={hrefFor(view.key)}
          >
            {view.label}
            {count !== null ? (
              <span className="legal-view-tab-count">{count.toLocaleString()}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
