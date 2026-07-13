import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { HolidayAdminPanel } from "@/components/hr/holiday-admin-panel";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listHolidays } from "@/lib/hr/holidays";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import {
  requireHrSubModule,
  resolveEnabledHrSubModules,
} from "@/lib/hr/hr-sub-modules";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ year?: string }>;
};

export default async function HrHolidaysPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const hrSettings = await getOrCreateHrSettings(user.organizationId);
  if (!requireHrSubModule(hrSettings.enabledHrSubModules, "holidays")) {
    redirect("/app/hr");
  }
  if (!hasMinimumRole(user.role, "ADMIN")) {
    redirect("/app/hr");
  }

  const params = await searchParams;
  const yearRaw = Number(params.year);
  const year =
    Number.isFinite(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
      ? yearRaw
      : new Date().getFullYear();

  const holidays = await listHolidays(user.organizationId, year);
  const enabledSubModules = resolveEnabledHrSubModules(
    hrSettings.enabledHrSubModules,
  );

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Holidays"
        description="Org holiday calendar. Mandatory weekday holidays auto-mark attendance; optional holidays show on the calendar only."
      />
      <HrSubNav
        activePath="/app/hr/holidays"
        isAdmin
        enabledSubModules={enabledSubModules}
      />

      <HolidayAdminPanel
        year={year}
        holidays={holidays.map((h) => ({
          id: h.id,
          date: h.date,
          name: h.name,
          isOptional: h.isOptional,
        }))}
      />
    </div>
  );
}
