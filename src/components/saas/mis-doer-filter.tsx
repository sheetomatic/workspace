"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import type { MisDoerOption } from "@/lib/mis/reports-data";

export function MisDoerFilter({
  options,
  currentDoer,
}: {
  options: MisDoerOption[];
  currentDoer?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeDoer = currentDoer ?? "all";

  const pushDoer = useCallback(
    (doer: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!doer || doer === "all") {
        params.delete("doer");
      } else {
        params.set("doer", doer);
      }

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  if (options.length <= 1) {
    return null;
  }

  return (
    <div
      className={`ws-mis-doer-filter${pending ? " is-loading" : ""}`}
      aria-label="MIS doer filter"
    >
      <div className="ws-mis-doer-filter-layout">
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">
            <UserRound size={14} aria-hidden />
            Doer
          </span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by doer"
              className="ws-filter-select"
              value={activeDoer}
              onChange={(event) => pushDoer(event.target.value)}
            >
              <option value="all">All doers</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
