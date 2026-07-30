import { notFound, redirect } from "next/navigation";
import { SalarySlipToolbar } from "@/components/hr/salary-slip-toolbar";
import { SalarySlipView } from "@/components/hr/salary-slip-view";
import { requireSession } from "@/lib/require-session";
import { getSalarySlipAction } from "@/lib/hr/hr-actions";
import { getEffectiveHrSubModulesForUser } from "@/lib/hr/hr-access";

type PageProps = {
  params: Promise<{ lineId: string }>;
};

export default async function SalarySlipPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const { allowed } = await getEffectiveHrSubModulesForUser(user);
  if (!allowed("payroll")) {
    redirect("/app/hr");
  }
  const { lineId } = await params;

  const slip = await getSalarySlipAction(lineId);
  if (!slip) {
    notFound();
  }

  return <SalarySlipView slip={slip} toolbar={<SalarySlipToolbar />} />;
}
