import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { HolidayAdminPanel } from "@/components/hr/holiday-admin-panel";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listHolidays } from "@/lib/hr/holidays";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ year?: string }>;
};

export default async function HrHolidaysPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
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

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Holidays"
        description="Org holiday calendar. Weekday holidays auto-mark attendance as Holiday for payroll."
      />
      <HrSubNav activePath="/app/hr/holidays" isAdmin />

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
