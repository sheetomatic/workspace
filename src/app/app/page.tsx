import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/saas/user-dashboard";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { hasWorkspaceModule, resolveWorkspaceHomeHref } from "@/lib/workspace-modules";
import { getUserDashboard } from "@/lib/workspace-data";

export default async function AppDashboardPage() {
  const user = await requireSession();

  if (hasWorkspaceModule(user, "TASKS")) {
    redirect(resolveWorkspaceHomeHref(user));
  }

  const displayName = user.name ?? user.email.split("@")[0];

  let dashboard;
  try {
    dashboard = await getUserDashboard(user);
  } catch (error) {
    console.error("getUserDashboard", error);
    throw new Error(
      "Dashboard data could not load. Run npm run db:seed and sign in again.",
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true },
  });

  return (
    <div className="saas-page crm-dashboard-page">
      <UserDashboard
        {...dashboard}
        organizationName={organization?.name ?? user.organizationName}
        userName={displayName}
        userRole={user.role}
      />
    </div>
  );
}
