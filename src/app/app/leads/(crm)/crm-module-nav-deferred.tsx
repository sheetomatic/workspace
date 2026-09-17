import { Suspense } from "react";
import { CrmModuleNav } from "@/components/saas/crm-module-nav";
import { getCrmModuleNavCounts } from "@/lib/leads/crm-module-stats";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { withDbRetry } from "@/lib/db";
import type { CrmSubModuleId } from "@/lib/crm/crm-sub-modules";

const EMPTY_COUNTS: CrmModuleNavCounts = {
  leads: 0,
  campaigns: 0,
  nextTime: 0,
  meetings: 0,
  quotations: 0,
  quotationValue: 0,
  services: 0,
  payments: 0,
  paymentValue: 0,
  projectsRunning: 0,
  projectsDelivered: 0,
  training: 0,
};

async function CrmModuleNavCounts({
  organizationId,
  enabledSubModules,
  moduleOrder,
}: {
  organizationId: string;
  enabledSubModules: CrmSubModuleId[];
  moduleOrder: string[];
}) {
  let counts = EMPTY_COUNTS;
  try {
    counts = await withDbRetry(() => getCrmModuleNavCounts(organizationId));
  } catch (error) {
    console.error("[crm-layout] nav counts unavailable", error);
  }

  return (
    <CrmModuleNav
      counts={counts}
      enabledSubModules={enabledSubModules}
      moduleOrder={moduleOrder}
    />
  );
}

export function CrmModuleNavDeferred({
  organizationId,
  enabledSubModules,
  moduleOrder,
}: {
  organizationId: string;
  enabledSubModules: CrmSubModuleId[];
  moduleOrder: string[];
}) {
  return (
    <Suspense
      fallback={
        <CrmModuleNav
          counts={EMPTY_COUNTS}
          enabledSubModules={enabledSubModules}
          moduleOrder={moduleOrder}
        />
      }
    >
      <CrmModuleNavCounts
        organizationId={organizationId}
        enabledSubModules={enabledSubModules}
        moduleOrder={moduleOrder}
      />
    </Suspense>
  );
}
