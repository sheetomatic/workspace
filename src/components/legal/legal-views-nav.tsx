"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LEGAL_VIEWS,
  legalViewPath,
  type LegalViewKey,
} from "@/lib/legal-cases/views";
import type { LegalViewNavCounts } from "@/lib/legal-cases/view-queries";

export function LegalViewsNav({ counts }: { counts: LegalViewNavCounts }) {
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

  return (
    <nav aria-label="Case views" className="legal-views-nav">
      {LEGAL_VIEWS.map((view) => {
        const count = counts[view.key];
        return (
          <Link
            key={view.key}
            aria-current={isActive(view.key) ? "page" : undefined}
            className={`legal-view-tab${isActive(view.key) ? " is-active" : ""}`}
            href={hrefFor(view.key)}
          >
            {view.label}
            <span className="legal-view-tab-count">{count.toLocaleString()}</span>
          </Link>
        );
      })}
    </nav>
  );
}
