import { notFound, redirect } from "next/navigation";
import { SalarySlipToolbar } from "@/components/hr/salary-slip-toolbar";
import { SalarySlipView } from "@/components/hr/salary-slip-view";
import { requireSession } from "@/lib/require-session";
import { getSalarySlipAction } from "@/lib/hr/hr-actions";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { requireHrSubModule } from "@/lib/hr/hr-sub-modules";

type PageProps = {
  params: Promise<{ lineId: string }>;
};

export default async function SalarySlipPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const hrSettings = await getOrCreateHrSettings(user.organizationId);
  if (!requireHrSubModule(hrSettings.enabledHrSubModules, "payroll")) {
    redirect("/app/hr");
  }
  const { lineId } = await params;

  const slip = await getSalarySlipAction(lineId);
  if (!slip) {
    notFound();
  }

  return <SalarySlipView slip={slip} toolbar={<SalarySlipToolbar />} />;
}
