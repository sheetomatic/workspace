import { LeadsTeamPerformance } from "@/components/saas/leads-team-performance";
import { LeadsPipelineCards } from "@/components/saas/leads-pipeline-cards";
import { currentMonthKeyIst, getTeamPerformance } from "@/lib/leads/team-performance";
import {
  getCrmNumbersMetricsForPeriod,
  getLeadsMachineStatsForPeriod,
  getLeadsPipeMetricsForPeriod,
} from "@/lib/leads/queries";
import type { LeadAssigneeScope } from "@/lib/leads/queries";
import type { LeadsPeriodRange } from "@/lib/leads/period";
import type { LeadsListSearchParams } from "@/lib/leads/list-params";
import { withDbRetry } from "@/lib/db";

export async function LeadsCrmSecondary({
  organizationId,
  period,
  leadScope,
  canSeeAllLeads,
  activeCategory,
  activeStatus,
  baseParams,
}: {
  organizationId: string;
  period: LeadsPeriodRange;
  leadScope?: LeadAssigneeScope;
  canSeeAllLeads: boolean;
  activeCategory?: string;
  activeStatus?: string;
  baseParams: LeadsListSearchParams;
}) {
  try {
    const [periodStats, pipeMetrics, numbersMetrics, teamPerformance] =
      await withDbRetry(() =>
        Promise.all([
          getLeadsMachineStatsForPeriod(organizationId, period, leadScope),
          getLeadsPipeMetricsForPeriod(organizationId, period, leadScope),
          getCrmNumbersMetricsForPeriod(organizationId, period, leadScope),
          canSeeAllLeads
            ? getTeamPerformance(organizationId, currentMonthKeyIst())
            : Promise.resolve(null),
        ]),
      );

    return (
      <>
        {canSeeAllLeads && teamPerformance ? (
          <LeadsTeamPerformance initial={teamPerformance} />
        ) : null}
        {pipeMetrics && numbersMetrics ? (
          <LeadsPipelineCards
            activeCategory={activeCategory}
            activeStatus={activeStatus}
            baseParams={baseParams}
            byStatus={periodStats.byStatus}
            numbersMetrics={numbersMetrics}
            pipeMetrics={pipeMetrics}
          />
        ) : null}
      </>
    );
  } catch (error) {
    console.error("leads secondary metrics unavailable", error);
    return null;
  }
}
