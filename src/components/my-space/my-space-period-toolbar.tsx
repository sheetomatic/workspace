import Link from "next/link";
import type { LeadsPeriodRange } from "@/lib/leads/period";
import { leadsPeriodToSearchParams, shiftLeadsPeriod } from "@/lib/leads/period";
import { mySpacePeriodHref, type MySpacePeriodType } from "@/lib/my-space/period";

export function MySpacePeriodToolbar({ period }: { period: LeadsPeriodRange }) {
  const type: MySpacePeriodType = period.type === "all" ? "all" : "monthly";
  const prev = shiftLeadsPeriod(
    period.type === "all" ? { ...period, type: "monthly" } : period,
    -1,
  );
  const next = shiftLeadsPeriod(
    period.type === "all" ? { ...period, type: "monthly" } : period,
    1,
  );

  return (
    <section className="leads-period-toolbar ws-myspace-period" aria-label="My Space period">
      <div className="leads-period-toolbar-row">
        <div className="leads-period-types">
          <Link
            className={type === "monthly" ? "leads-machine-filter active" : "leads-machine-filter"}
            href={mySpacePeriodHref("monthly", period.month)}
          >
            Monthly
          </Link>
          <Link
            className={type === "all" ? "leads-machine-filter active" : "leads-machine-filter"}
            href={mySpacePeriodHref("all")}
          >
            All Time
          </Link>
        </div>
        {type === "monthly" ? (
          <div className="leads-period-nav">
            <Link
              className="btn-secondary btn-sm"
              href={`/app/my-space?${leadsPeriodToSearchParams({ ...prev, type: "monthly" }).toString()}`}
            >
              Previous
            </Link>
            <Link
              className="btn-secondary btn-sm"
              href={`/app/my-space?${leadsPeriodToSearchParams({ ...next, type: "monthly" }).toString()}`}
            >
              Next
            </Link>
          </div>
        ) : null}
      </div>
      <p className="leads-period-label">{period.periodLabel}</p>
    </section>
  );
}
